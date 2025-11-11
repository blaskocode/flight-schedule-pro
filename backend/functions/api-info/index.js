exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      service: 'Flight Schedule Pro API',
      version: '1.0.0',
      status: 'operational',
      endpoints: {
        flights: {
          'GET /flights': 'List all flights',
          'POST /flights': 'Create a new flight',
        },
        weather: {
          'POST /weather/check': 'Check weather for a flight',
        },
        reschedule: {
          'POST /reschedule/generate': 'Generate AI reschedule options',
          'POST /reschedule/select': 'Select a reschedule option',
          'POST /reschedule/approve': 'Approve a reschedule request',
        },
        admin: {
          'POST /admin/migrate': 'Run database migrations',
          'POST /admin/seed': 'Seed database with test data',
        },
      },
      authentication: 'All endpoints (except /admin) require Cognito authentication',
      documentation: 'See API_DOCUMENTATION.md for detailed API documentation',
    }),
  };
};

