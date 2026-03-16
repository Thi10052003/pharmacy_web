class ApiError extends Error {
  constructor(code, message, details = null, status = 400) {
    super(message)
    this.code = code
    this.details = details
    this.status = status
  }
}

module.exports = { ApiError }
