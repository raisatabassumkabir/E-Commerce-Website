class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // distinguishes our errors from unexpected crashes

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
