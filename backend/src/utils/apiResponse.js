export class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200, meta = null) {
    const payload = {
      success: true,
      message,
      data
    };
    if (meta) {
      payload.meta = meta;
    }
    return res.status(statusCode).json(payload);
  }

  static created(res, data = null, message = 'Resource created successfully', meta = null) {
    return this.success(res, data, message, 201, meta);
  }

  static paginated(res, data = [], pagination = {}, message = 'Data fetched successfully') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: Number(pagination.page) || 1,
        limit: Number(pagination.limit) || 20,
        total: Number(pagination.total) || 0,
        totalPages: Math.ceil((Number(pagination.total) || 0) / (Number(pagination.limit) || 20))
      }
    });
  }

  static error(res, message = 'An error occurred', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors && { errors })
    });
  }
}
