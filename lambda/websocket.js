const {Client, follow} = require('../helper/client');
const Topic = require('../helper/topic');

exports.httpHandler = async (event) => {
    const response = { 
        "isBase64Encoded": false,
        "statusCode": 200,
        "body": JSON.stringify('http ok')
    };
    let body = JSON.parse(event.body)
    let topic
    console.info(body['receiver'])
    // set connectionId
    if (!event.body && !body.receiver) {
        return { statusCode: 500, body: JSON.stringify({ "message": "`receiver` parameter required" }) };
    }
    // set topic
    if (event.body && body.topic) {
        topic = body.topic
    } else {
        return { statusCode: 500, body: JSON.stringify({ "message": "`topic` parameter required" }) };
    }
    try {
        await new Topic(topic).privateMessage(body)
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ "message": "error on @handlerWSMessage" }) }
    }
    return response
}

exports.handler = async (event) => {
    try {
        const response = { 
            "isBase64Encoded": false,
            "statusCode": 200,
            "body": JSON.stringify('websocket ok')
        };
        console.log(`Received socket connectionId: ${event.requestContext && event.requestContext.connectionId}`);
        if (!(event.requestContext && event.requestContext.connectionId)) {
            throw new Error('Invalid event. Missing `connectionId` parameter.');
        }
        const connectionId = event.requestContext.connectionId;
        const route = event.requestContext.routeKey;
        console.log(`data from ${connectionId} ${event.body}`)
        
        if (route === '$connect') {
            console.log(`Route ${route} - Socket connectionId conected: ${event.requestContext && event.requestContext.connectionId}`);
            await new Client(connectionId).connect();
            return response;
        } else if (route === '$disconnect') {
            console.log(`Route ${route} - Socket connectionId disconnected: ${event.requestContext && event.requestContext.connectionId}`);
            await new Client(connectionId).unsubscribe();
            return response;
        } else {
            const connection = new Client(connectionId);
            console.log(`Route ${route} - data from ${connectionId}`);
            if (!event.body) {
                return response;
            }

            let body = JSON.parse(event.body);
            const topic = body.topic;

            if (body.type === 'subscribe') {
                await connection.subscribe({topic});
                console.log(`Client subscribing for topic: ${topic}`);
            }

            if (body.type === 'follow') {
                await follow(connectionId, topic);
                console.log(`Client subscribing for topic: ${topic}`);
            }

            if (body.type === 'message') {
                await new Topic(topic).publishMessage({ data: body.message });
                console.error(`Published messages to subscribers`);
                return response;
            }
            
            if (body.type === 'getConnectionId') {
                await connection.getConnId();
                console.log(`Client subscribing for topic: ${topic}`);
            }

            if (body.type === 'stop') {
                return response;
            }

            return response;
        }
    } catch (err) {
        console.error(err.message);
    }
    return null;
}
