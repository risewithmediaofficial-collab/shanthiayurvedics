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

  static paginated(res, data = [], pagination = {}, message = 'Data fetched successfully', extra = {}) {
    const total = Number(pagination.total) || 0;
    const limit = Number(pagination.limit) || 20;
    const page = Number(pagination.page) || 1;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return res.status(200).json({
      ...extra,
      success: true,
      message,
      data,
      pagination: {
        ...pagination,
        page,
        limit,
        total,
        totalPages
      },
      meta: {
        ...(extra.meta || {}),
        page,
        limit,
        total,
        totalPages,
        summary: extra.summary || extra.meta?.summary
      }
    });
  }

  static badRequest(res, message = 'Bad request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  static unauthorized(res, message = 'Unauthorized', errors = null) {
    return this.error(res, message, 401, errors);
  }

  static forbidden(res, message = 'Forbidden', errors = null) {
    return this.error(res, message, 403, errors);
  }

  static notFound(res, message = 'Resource not found', errors = null) {
    return this.error(res, message, 404, errors);
  }

  static error(res, message = 'An error occurred', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors && { errors })
    });
  }
}
