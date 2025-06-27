use std::alloc::{alloc, dealloc, Layout};
use std::ptr;
use std::os::raw::{c_char, c_int};
use libc::size_t;
use zeroize::Zeroize;
use crate::PQCError;

#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub enum FFIErrorCode {
    Success = 0,
    InvalidInput = -1,
    AllocationFailed = -2,
    CryptoError = -3,
    BufferTooSmall = -4,
    NullPointer = -5,
    InvalidKeyFormat = -6,
    SignatureVerificationFailed = -7,
}

pub struct FFIBuffer {
    ptr: *mut u8,
    len: usize,
    capacity: usize,
}

impl FFIBuffer {
    pub fn new(size: usize) -> Result<Self, PQCError> {
        if size == 0 {
            return Err(PQCError::MemoryAllocationFailed);
        }
        
        let layout = Layout::array::<u8>(size)
            .map_err(|_| PQCError::MemoryAllocationFailed)?;
        
        let ptr = unsafe { alloc(layout) };
        if ptr.is_null() {
            return Err(PQCError::MemoryAllocationFailed);
        }
        
        Ok(Self {
            ptr,
            len: size,
            capacity: size,
        })
    }
    
    pub fn from_raw_parts(ptr: *mut u8, len: size_t) -> Self {
        Self {
            ptr,
            len,
            capacity: len,
        }
    }
    
    pub fn as_mut_ptr(&mut self) -> *mut u8 {
        self.ptr
    }
    
    pub fn into_raw(self) -> *mut u8 {
        let ptr = self.ptr;
        std::mem::forget(self);
        ptr
    }
    
    pub fn secure_free(self) {
        if !self.ptr.is_null() && self.len > 0 {
            unsafe {
                let slice = std::slice::from_raw_parts_mut(self.ptr, self.len);
                slice.zeroize();
                
                let layout = Layout::array::<u8>(self.capacity).unwrap();
                dealloc(self.ptr, layout);
            }
        }
    }
}

impl Drop for FFIBuffer {
    fn drop(&mut self) {
        if !self.ptr.is_null() && self.len > 0 {
            unsafe {
                let slice = std::slice::from_raw_parts_mut(self.ptr, self.len);
                slice.zeroize();
                
                let layout = Layout::array::<u8>(self.capacity).unwrap();
                dealloc(self.ptr, layout);
            }
        }
    }
}

pub fn validate_buffer_params(ptr: *const u8, len: size_t) -> Result<(), PQCError> {
    if ptr.is_null() {
        return Err(PQCError::InvalidPublicKey("Null pointer provided".to_string()));
    }
    
    if len == 0 {
        return Err(PQCError::InvalidPublicKey("Zero length buffer".to_string()));
    }
    
    Ok(())
}

pub fn safe_slice_from_raw<'a>(ptr: *const u8, len: size_t) -> Result<&'a [u8], PQCError> {
    validate_buffer_params(ptr, len)?;
    Ok(unsafe { std::slice::from_raw_parts(ptr, len) })
}

#[no_mangle]
pub extern "C" fn ffi_buffer_free(ptr: *mut u8, len: size_t) {
    if !ptr.is_null() && len > 0 {
        let buffer = FFIBuffer::from_raw_parts(ptr, len);
        buffer.secure_free();
    }
}

static mut LAST_ERROR_MESSAGE: Option<String> = None;

#[no_mangle]
pub extern "C" fn ffi_get_last_error_message() -> *const c_char {
    unsafe {
        match &LAST_ERROR_MESSAGE {
            Some(msg) => msg.as_ptr() as *const c_char,
            None => ptr::null(),
        }
    }
}

pub fn set_last_error(error: &str) {
    unsafe {
        LAST_ERROR_MESSAGE = Some(error.to_string());
    }
}
