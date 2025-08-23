// Enhanced transaction creation with comprehensive error handling
app.post("/api/transactions", requireNotDemo, async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    logger.info(`[Request: ${requestId}] Transaction creation started`, {
      body: req.body,
      user: req.user?.username || 'unknown'
    });

    // Validate request body
    if (!req.body || Object.keys(req.body).length === 0) {
      logger.warn(`[Request: ${requestId}] Empty request body received`);
      return res.status(400).json({
        success: false,
        error: 'Request body is required',
        requestId
      });
    }

    // Validate schema with detailed error reporting
    let validatedData;
    try {
      validatedData = insertTransactionSchema.parse(req.body);
      logger.info(`[Request: ${requestId}] Schema validation successful`);
    } catch (validationError) {
      logger.error(`[Request: ${requestId}] Schema validation failed`, validationError);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationError.errors || validationError.message,
        requestId
      });
    }

    // Test database connection before attempting transaction creation
    try {
      await sql('SELECT 1');
      logger.info(`[Request: ${requestId}] Database connectivity confirmed`);
    } catch (dbError) {
      logger.error(`[Request: ${requestId}] Database connection failed`, dbError);
      return res.status(503).json({
        success: false,
        error: 'Database connection failed',
        details: 'Unable to connect to database',
        requestId
      });
    }

    // Create transaction with retry logic
    let transaction;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        logger.info(`[Request: ${requestId}] Attempting transaction creation (attempt ${retryCount + 1})`);
        transaction = await storage.createTransaction(validatedData);
        logger.info(`[Request: ${requestId}] Transaction created successfully`, {
          transactionId: transaction?.id,
          duration: Date.now() - startTime
        });
        break;
      } catch (creationError) {
        retryCount++;
        logger.error(`[Request: ${requestId}] Transaction creation failed (attempt ${retryCount})`, creationError);
        
        if (retryCount >= maxRetries) {
          throw creationError;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }

    if (!transaction) {
      throw new Error('Transaction creation returned null/undefined');
    }

    // Send response
    const response = {
      success: true,
      data: transaction,
      message: 'Transaction created successfully',
      requestId,
      duration: Date.now() - startTime
    };

    res.json(response);
    
    // Emit socket event (non-blocking)
    try {
      io.emit("transactionCreated", transaction);
    } catch (socketError) {
      logger.warn(`[Request: ${requestId}] Socket emission failed`, socketError);
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`[Request: ${requestId}] Transaction creation failed completely`, {
      error: error.message,
      stack: error.stack,
      duration,
      body: req.body
    });
    
    // Handle specific error types
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
        requestId,
        duration
      });
    }
    
    // Database connectivity issues
    if (error?.message?.includes('fetch failed') || 
        error?.message?.includes('ENOTFOUND') ||
        error?.message?.includes('connection') ||
        error?.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Database connectivity issue',
        message: 'Please try again in a moment',
        requestId,
        duration
      });
    }
    
    // Generic server error
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Transaction creation failed',
      requestId,
      duration,
      details: process.env.NODE_ENV === 'development' ? error.message : 'Contact support if this persists'
    });
    
    // Emit error event
    try {
      io.emit('error', {
        type: 'transaction',
        message: 'Failed to create transaction',
        details: error?.message,
        requestId
      });
    } catch (socketError) {
      logger.warn(`[Request: ${requestId}] Error socket emission failed`, socketError);
    }
  }
});
