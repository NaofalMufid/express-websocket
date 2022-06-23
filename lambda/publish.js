const DynamoDB = require('aws-sdk/clients/dynamodb');
const Topic = require('../helper/topic');

const parseNewEvent = DynamoDB.Converter.unmarshall;

exports.handler = async (event) => {
  console.log(event.Records);
  const subscruptionEvent = event.Records[0];
  if (subscruptionEvent.eventName !== 'INSERT') {
    throw new Error('Invalid event. Wrong dynamodb event type, can publish only `INSERT` events to subscribers.');
  }
  const { topic, data } = process.env.IS_OFFLINE
    ? subscruptionEvent.dynamodb.NewImageSconnectWebsocketsRoute
    : parseNewEvent(subscruptionEvent.dynamodb.NewImage);
  return new Topic(topic).publishMessage(data);
}
