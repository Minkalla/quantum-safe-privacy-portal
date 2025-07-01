use libc::size_t;
use std::alloc::{alloc, dealloc, Layout};
use std::ffi::CString;
use std::os::raw::c_char;
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

impl std::fmt::Display for FFIErrorCode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FFIErrorCode::Success => write!(f, "Success"),
            FFIErrorCode::InvalidInput => write!(f, "Invalid input"),
            FFIErrorCode::AllocationFailed => write!(f, "Allocation failed"),
            FFIErrorCode::CryptoError => write!(f, "Crypto error"),
            FFIErrorCode::BufferTooSmall => write!(f, "Buffer too small"),
            FFIErrorCode::NullPointer => write!(f, "Null pointer"),
            FFIErrorCode::InvalidKeyFormat => write!(f, "Invalid key format"),
            FFIErrorCode::SignatureVerificationFailed => write!(f, "Signature verification failed"),
        }
    }
}

static mut LAST_FFI_ERROR: Option<CString> = None;

fn set_last_ffi_error(error: &str) {
    unsafe {
        LAST_FFI_ERROR = CString::new(error).ok();
    }
}

#[no_mangle]
pub extern "C" fn ffi_get_last_error_message() -> *const c_char {
    unsafe {
        match &LAST_FFI_ERROR {
            Some(err) => err.as_ptr(),
            None => ptr::null(),
        }
    }
}

pub struct FFIBuffer {
    ptr: *mut u8,
    len: usize,
    capacity: usize,
}

#[derive(Debug)]
pub enum FFIError {
    InvalidInput,
    AllocationFailed,
    CryptoError,
    BufferTooSmall,
    NullPointer,
    InvalidKeyFormat,
    SignatureVerificationFailed,
}

impl std::fmt::Display for FFIError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FFIError::InvalidInput => write!(f, "Invalid input provided"),
            FFIError::AllocationFailed => write!(f, "Memory allocation failed"),
            FFIError::CryptoError => write!(f, "Cryptographic operation failed"),
            FFIError::BufferTooSmall => write!(f, "Buffer too small for operation"),
            FFIError::NullPointer => write!(f, "Null pointer encountered"),
            FFIError::InvalidKeyFormat => write!(f, "Invalid key format"),
            FFIError::SignatureVerificationFailed => write!(f, "Signature verification failed"),
        }
    }
}

impl From<FFIError> for FFIErrorCode {
    fn from(error: FFIError) -> Self {
        match error {
            FFIError::InvalidInput => FFIErrorCode::InvalidInput,
            FFIError::AllocationFailed => FFIErrorCode::AllocationFailed,
            FFIError::CryptoError => FFIErrorCode::CryptoError,
            FFIError::BufferTooSmall => FFIErrorCode::BufferTooSmall,
            FFIError::NullPointer => FFIErrorCode::NullPointer,
            FFIError::InvalidKeyFormat => FFIErrorCode::InvalidKeyFormat,
            FFIError::SignatureVerificationFailed => FFIErrorCode::SignatureVerificationFailed,
        }
    }
}

impl FFIBuffer {
    pub fn new(size: usize) -> Result<Self, FFIError> {
        if size == 0 {
            set_last_ffi_error("Buffer size cannot be zero");
            return Err(FFIError::InvalidInput);
        }

        let layout = Layout::from_size_align(size, 1).map_err(|_| {
            set_last_ffi_error("Failed to create memory layout");
            FFIError::AllocationFailed
        })?;

        let ptr = unsafe { alloc(layout) };
        if ptr.is_null() {
            set_last_ffi_error("Memory allocation failed");
            return Err(FFIError::AllocationFailed);
        }

        unsafe {
            ptr::write_bytes(ptr, 0, size);
        }

        Ok(FFIBuffer {
            ptr,
            len: 0,
            capacity: size,
        })
    }

    pub fn as_mut_ptr(&mut self) -> *mut u8 {
        self.ptr
    }

    pub fn as_ptr(&self) -> *mut u8 {
        self.ptr
    }

    pub fn len(&self) -> usize {
        self.len
    }

    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    pub fn capacity(&self) -> usize {
        self.capacity
    }

    pub fn write_data(&mut self, data: &[u8]) -> Result<(), FFIError> {
        if data.len() > self.capacity {
            set_last_ffi_error("Data size exceeds buffer capacity");
            return Err(FFIError::BufferTooSmall);
        }

        unsafe {
            ptr::copy_nonoverlapping(data.as_ptr(), self.ptr, data.len());
        }
        self.len = data.len();
        Ok(())
    }

    pub fn as_slice(&self) -> &[u8] {
        unsafe { std::slice::from_raw_parts(self.ptr, self.len) }
    }

    pub fn into_raw(self) -> *mut u8 {
        let ptr = self.ptr;
        std::mem::forget(self);
        ptr
    }

    pub fn secure_free(mut self) {
        if !self.ptr.is_null() {
            unsafe {
                let slice = std::slice::from_raw_parts_mut(self.ptr, self.capacity);
                slice.zeroize();
                let layout = Layout::from_size_align_unchecked(self.capacity, 1);
                dealloc(self.ptr, layout);
            }
            self.ptr = ptr::null_mut();
            self.len = 0;
            self.capacity = 0;
        }
    }
}

impl Drop for FFIBuffer {
    fn drop(&mut self) {
        if !self.ptr.is_null() {
            unsafe {
                let slice = std::slice::from_raw_parts_mut(self.ptr, self.capacity);
                slice.zeroize();
                let layout = Layout::from_size_align_unchecked(self.capacity, 1);
                dealloc(self.ptr, layout);
            }
            self.ptr = ptr::null_mut();
            self.len = 0;
            self.capacity = 0;
        }
    }
}

pub fn validate_buffer_params(ptr: *const u8, len: usize) -> Result<(), FFIErrorCode> {
    if ptr.is_null() {
        set_last_ffi_error("Buffer pointer is null");
        return Err(FFIErrorCode::NullPointer);
    }
    if len == 0 {
        set_last_ffi_error("Buffer length cannot be zero");
        return Err(FFIErrorCode::InvalidInput);
    }
    Ok(())
}

pub fn safe_slice_from_raw<'a>(ptr: *const u8, len: usize) -> Result<&'a [u8], FFIErrorCode> {
    validate_buffer_params(ptr, len)?;
    unsafe { Ok(std::slice::from_raw_parts(ptr, len)) }
}

pub fn set_last_error(error: &str) {
    set_last_ffi_error(error);
}

#[no_mangle]
pub extern "C" fn ffi_buffer_free(ptr: *mut u8, len: size_t) {
    if !ptr.is_null() && len > 0 {
        unsafe {
            let layout = std::alloc::Layout::array::<u8>(len).unwrap();
            let slice = std::slice::from_raw_parts_mut(ptr, len);
            slice.zeroize();
            std::alloc::dealloc(ptr, layout);
        }
    }
}
