const BASE_MULTIPART_UPLOAD_CONFIG = {
  headers: { 'Content-Type': 'multipart/form-data' },
  timeout: 0,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
}

function multipartUploadConfig(options = {}) {
  const { headers, ...rest } = options
  return {
    ...BASE_MULTIPART_UPLOAD_CONFIG,
    ...rest,
    headers: {
      ...BASE_MULTIPART_UPLOAD_CONFIG.headers,
      ...headers,
    },
  }
}

export { multipartUploadConfig }
