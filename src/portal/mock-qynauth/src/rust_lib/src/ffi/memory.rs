use std::alloc::{alloc, dealloc, Layout};
use std::ptr;
use zeroize::Zeroize;

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
    pub fn new(size: usize) -> Result<Self, FFIErrorCode> {
        if size == 0 {
            return Err(FFIErrorCode::InvalidInput);
        }
        
        let layout = Layout::from_size_align(size, 1)
            .map_err(|_| FFIErrorCode::AllocationFailed)?;
        
        let ptr = unsafe { alloc(layout) };
        if ptr.is_null() {
            return Err(FFIErrorCode::AllocationFailed);
        }
        
        Ok(FFIBuffer {
            ptr,
            len: 0,
            capacity: size,
        })
    }
    
    pub fn as_ptr(&self) -> *mut u8 {
        self.ptr
    }
    
    pub fn len(&self) -> usize {
        self.len
    }
    
    pub fn capacity(&self) -> usize {
        self.capacity
    }
    
    pub fn write_data(&mut self, data: &[u8]) -> Result<(), FFIErrorCode> {
        if data.len() > self.capacity {
            return Err(FFIErrorCode::BufferTooSmall);
        }
        
        unsafe {
            ptr::copy_nonoverlapping(data.as_ptr(), self.ptr, data.len());
        }
        self.len = data.len();
        Ok(())
    }
    
    pub fn secure_free(mut self) {
        if !self.ptr.is_null() {
            unsafe {
                ptr::write_bytes(self.ptr, 0, self.capacity);
                let layout = Layout::from_size_align_unchecked(self.capacity, 1);
                dealloc(self.ptr, layout);
            }
            self.ptr = ptr::null_mut();
        }
    }
}

impl Drop for FFIBuffer {
    fn drop(&mut self) {
        if !self.ptr.is_null() {
            unsafe {
                ptr::write_bytes(self.ptr, 0, self.capacity);
                let layout = Layout::from_size_align_unchecked(self.capacity, 1);
                dealloc(self.ptr, layout);
            }
            self.ptr = ptr::null_mut();
        }
    }
}

pub fn validate_buffer_params(ptr: *const u8, len: usize) -> Result<(), FFIErrorCode> {
    if ptr.is_null() {
        return Err(FFIErrorCode::NullPointer);
    }
    if len == 0 {
        return Err(FFIErrorCode::InvalidInput);
    }
    Ok(())
}

pub fn safe_slice_from_raw<'a>(ptr: *const u8, len: usize) -> Result<&'a [u8], FFIErrorCode> {
    validate_buffer_params(ptr, len)?;
    unsafe {
        Ok(std::slice::from_raw_parts(ptr, len))
    }
}

pub fn secure_allocate(size: usize) -> Result<*mut u8, FFIErrorCode> {
    if size == 0 {
        return Err(FFIErrorCode::InvalidInput);
    }
    
    let layout = Layout::from_size_align(size, 1)
        .map_err(|_| FFIErrorCode::AllocationFailed)?;
    
    let ptr = unsafe { alloc(layout) };
    if ptr.is_null() {
        return Err(FFIErrorCode::AllocationFailed);
    }
    
    unsafe {
        ptr::write_bytes(ptr, 0, size);
    }
    
    Ok(ptr)
}

pub fn secure_deallocate(ptr: *mut u8, size: usize) {
    if ptr.is_null() || size == 0 {
        return;
    }
    
    unsafe {
        ptr::write_bytes(ptr, 0, size);
        let layout = Layout::from_size_align_unchecked(size, 1);
        dealloc(ptr, layout);
    }
}
