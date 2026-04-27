function getErrorMessage(error, fallbackMessage = 'Something went wrong. Please try again.') {
  if (typeof error?.response?.data === 'string' && error.response.data.trim()) {
    return error.response.data
  }

  if (typeof error?.response?.data?.response === 'string' && error.response.data.response.trim()) {
    return error.response.data.response
  }

  if (typeof error?.response?.data?.message === 'string' && error.response.data.message.trim()) {
    return error.response.data.message
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message
  }

  return fallbackMessage
}

export { getErrorMessage }
