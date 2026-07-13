// put-admin-participants/index.js - multi-tenant: scoped to hackathon_id

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Configure AWS DynamoDB DocumentClient
const client = new DynamoDBClient({ region: process.env.REGION || "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);

// Environment Variables (MUST BE SET IN LAMBDA CONFIGURATION)
// TABLE_NAME: Your DynamoDB table name (e.g., HackathonRegistrations)
// ALLOWED_ORIGIN: Your frontend URL (e.g., http://localhost:8080 or https://your-admin-app.com)
const PARTICIPANTS_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || process.env.TABLE_NAME || 'HackathonRegistrations'; // Default for local
const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:8080"; // Default for local

const HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Hackathon-Id",
    "Access-Control-Allow-Methods": "PUT,OPTIONS",
};

const resolveHackathonId = (event, body) => {
    const pp = event.pathParameters || {};
    if (pp.hackathonId) return pp.hackathonId;
    const h = event.headers || {};
    if (h['X-Hackathon-Id'] || h['x-hackathon-id']) return h['X-Hackathon-Id'] || h['x-hackathon-id'];
    return body?.hackathon_id || null;
};

export const handler = async (event) => {
    console.log('Received event:', JSON.stringify(event));

    const responseHeaders = HEADERS;

    if (event.requestContext?.http?.method === "OPTIONS" || event.httpMethod === "OPTIONS") {
        console.log("Handling CORS preflight request");
        return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify({ message: "CORS preflight passed" }),
        };
    }

    try {
        const participantId = event.pathParameters?.id; // Get ID from path parameters
        const body = JSON.parse(event.body);
        const {
            teamName,
            leader, // Object: { name: string, email: string, ... }
            track,
            members, // Array of objects { name: string, email?: string, ... }
            emails, // Array of strings (all emails)
            agreeEmailCommunications,
            agreeMarketingEmails,
            agreeTermsConditions,
            status // Optional: to update status (PENDING_APPROVAL, APPROVED, REJECTED)
        } = body;

        // Resolve hackathon scope (path / header / body)
        const hackathonId = resolveHackathonId(event, body);
        if (!hackathonId) {
            return {
                statusCode: 400,
                headers: responseHeaders,
                body: JSON.stringify({ message: 'Missing hackathon id' }),
            };
        }

        // Basic validation for the ID
        if (!participantId) {
            console.error("Validation Error: Participant ID is required.");
            return {
                statusCode: 400,
                headers: responseHeaders,
                body: JSON.stringify({ message: 'Participant ID is required.' }),
            };
        }

        // Validate core data for update
        if (!teamName || !leader || !leader.name || !leader.email || !track) {
            console.error("Validation Error: Missing core required fields for update: teamName, leader.name, leader.email, track.");
            return {
                statusCode: 400,
                headers: responseHeaders,
                body: JSON.stringify({ message: 'Missing core required fields for update.' }),
            };
        }

        // Build UpdateExpression and ExpressionAttributeValues dynamically
        let UpdateExpression = 'set ';
        let ExpressionAttributeValues = {};
        let ExpressionAttributeNames = {};
        let attributes = [];

        // Always update these core fields if provided
        attributes.push('teamName = :tn'); ExpressionAttributeValues[':tn'] = teamName;
        attributes.push('leader = :l'); ExpressionAttributeValues[':l'] = JSON.stringify(leader); // Store leader as string
        attributes.push('track = :tr'); ExpressionAttributeValues[':tr'] = track;
        attributes.push('members = :m'); ExpressionAttributeValues[':m'] = JSON.stringify(members || []); // Store members as string
        attributes.push('emails = :e'); ExpressionAttributeValues[':e'] = emails || []; // Store emails as array

        // Update agreement fields (optional, but good to ensure they are set)
        if (agreeEmailCommunications !== undefined) {
            attributes.push('agreeEmailCommunications = :aec'); ExpressionAttributeValues[':aec'] = agreeEmailCommunications;
        }
        if (agreeMarketingEmails !== undefined) {
            attributes.push('agreeMarketingEmails = :ame'); ExpressionAttributeValues[':ame'] = agreeMarketingEmails;
        }
        if (agreeTermsConditions !== undefined) {
            attributes.push('agreeTermsConditions = :atc'); ExpressionAttributeValues[':atc'] = agreeTermsConditions;
        }

        // Update status if provided (only for admin)
        if (status !== undefined) {
            // 'status' is a reserved keyword in DynamoDB, so use ExpressionAttributeNames
            attributes.push('#s = :s');
            ExpressionAttributeValues[':s'] = status;
            ExpressionAttributeNames['#s'] = 'status';
        }

        if (attributes.length === 0) {
            console.error("Validation Error: No attributes provided for update.");
            return {
                statusCode: 400,
                headers: responseHeaders,
                body: JSON.stringify({ message: 'No attributes provided for update.' }),
            };
        }

        UpdateExpression += attributes.join(', ');

        // Multi-tenant guard: only update a registration belonging to this hackathon.
        ExpressionAttributeValues[':h'] = hackathonId;

        const params = {
            TableName: PARTICIPANTS_TABLE_NAME,
            Key: {
                id: participantId,
            },
            UpdateExpression: UpdateExpression,
            ConditionExpression: 'hackathon_id = :h',
            ExpressionAttributeValues: ExpressionAttributeValues,
            ExpressionAttributeNames: Object.keys(ExpressionAttributeNames).length > 0 ? ExpressionAttributeNames : undefined,
            ReturnValues: 'ALL_NEW', // Return the updated item
        };

        console.log('Updating item in DynamoDB with params:', JSON.stringify(params));
        const result = await docClient.send(new UpdateCommand(params));
        console.log('Participant updated successfully in DynamoDB:', JSON.stringify(result.Attributes));

        return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify({ message: 'Participant updated successfully', updatedParticipant: result.Attributes }),
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
        console.error('Error updating participant:', error);
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ message: 'Failed to update participant', error: error.message }),
        };
    }
};
