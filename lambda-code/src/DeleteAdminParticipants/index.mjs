// delete-admin-participants/index.js - multi-tenant: scoped to hackathon_id

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.REGION || "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);

const PARTICIPANTS_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || process.env.TABLE_NAME || 'HackathonRegistrations';

const HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*", // Allow all origins
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Hackathon-Id",
    "Access-Control-Allow-Methods": "DELETE,OPTIONS",
};

const resolveHackathonId = (event) => {
    const pp = event.pathParameters || {};
    if (pp.hackathonId) return pp.hackathonId;
    const h = event.headers || {};
    if (h['X-Hackathon-Id'] || h['x-hackathon-id']) return h['X-Hackathon-Id'] || h['x-hackathon-id'];
    let body = {};
    if (event.body) {
        try { body = JSON.parse(event.body); } catch (e) { body = {}; }
    }
    return body.hackathon_id || null;
};

export const handler = async (event) => {
    console.log('Received event:', JSON.stringify(event));

    const responseHeaders = HEADERS;

    if (event.requestContext?.http?.method === "OPTIONS" || event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify({ message: "CORS preflight passed" }),
        };
    }

    try {
        const hackathonId = resolveHackathonId(event);
        if (!hackathonId) {
            return {
                statusCode: 400,
                headers: responseHeaders,
                body: JSON.stringify({ message: 'Missing hackathon id' }),
            };
        }

        const participantId = event.pathParameters?.id || event.pathParameters?.participantId;

        if (!participantId) {
            return {
                statusCode: 400,
                headers: responseHeaders,
                body: JSON.stringify({ message: 'Participant ID is required.' }),
            };
        }

        const params = {
            TableName: PARTICIPANTS_TABLE_NAME,
            Key: {
                id: participantId,
            },
            ConditionExpression: 'hackathon_id = :h',
            ExpressionAttributeValues: {
                ':h': hackathonId,
            },
        };

        console.log('Deleting participant:', participantId, 'in hackathon:', hackathonId);
        await docClient.send(new DeleteCommand(params));
        console.log('Participant deleted successfully');

        return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify({ message: 'Participant deleted successfully' }),
        };

    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            console.warn('Participant not found for this hackathon');
            return {
                statusCode: 404,
                headers: responseHeaders,
                body: JSON.stringify({ message: 'Participant not found' }),
            };
        }
        console.error('Error deleting participant:', error);
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ message: 'Failed to delete participant', error: error.message }),
        };
    }
};
