const express = require('express');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
require('dotenv').config(); // For local development

const app = express();
const port = process.env.PORT || 8080;

// Middleware for static files
app.use(express.static(path.join(__dirname, 'public')));

// Function to fetch secrets from Google Secret Manager
async function getSecret(secretName) {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/${secretName}/versions/latest`,
  });
  return version.payload.data.toString();
}

// Main application logic
(async () => {
  try {
    // Fetch secrets and set environment variables
    if (process.env.NODE_ENV === 'production') {
      console.log('Fetching secrets for production...');
      process.env.DATABASE_URL = await getSecret('DATABASE_URL');
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not set.');
      }
    }

    // Initialize Sequelize
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: process.env.NODE_ENV === 'production'
        ? {
            
          }
        : {},
    });

    // Define the Visit model
    const Visit = sequelize.define('Visit', {
      ip: { type: DataTypes.STRING },
      user_agent: { type: DataTypes.TEXT },
      city: { type: DataTypes.STRING },
      region: { type: DataTypes.STRING },
      country: { type: DataTypes.STRING },
      latitude: { type: DataTypes.STRING },
      longitude: { type: DataTypes.STRING },
      visited_at: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
    });

    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync models
    await Visit.sync();

    // Routes
    app.get('/', (req, res) => {
      res.send('App is running and connected to the database.');
    });

    // Route: Log client information
    app.get('/api/client-info', async (req, res) => {
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';
      const userAgent = req.headers['user-agent'] || 'Unknown';

      try {
        await Visit.create({
          ip,
          user_agent: userAgent,
          city: 'N/A',
          region: 'N/A',
          country: 'N/A',
          latitude: 'N/A',
          longitude: 'N/A',
        });
      } catch (error) {
        console.error('Database error:', error.message);
      }

      res.json({
        ip,
        userAgent,
        locationData: 'N/A (IP lookup not implemented here for simplicity)',
      });
    });

    // Route: Fetch paginated logs
    app.get('/api/logs', async (req, res) => {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      try {
        const { count, rows } = await Visit.findAndCountAll({
          offset: parseInt(offset),
          limit: parseInt(limit),
          order: [['visited_at', 'DESC']],
        });

        res.json({
          totalRecords: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          logs: rows,
        });
      } catch (error) {
        console.error('Error fetching logs:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });


    // Route: Serve logs.html for /logs
    app.get('/logs', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'logs.html'));
    });

    // Start the server
    app.listen(port, () => {
      console.log(`App running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize application:', error.message);
    process.exit(1);
  }
})();
