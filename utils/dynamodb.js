const DynamoDB = require('aws-sdk/clients/dynamodb');

const localConfig = {
  region: 'localhost',
  endpoint: 'http://localhost:8000',
};

const remoteConfig = {
  region: process.env.REGION,
};

const dynamoDBClient = new DynamoDB.DocumentClient(process.env.IS_OFFLINE ? localConfig : remoteConfig);
module.exports = dynamoDBClient
