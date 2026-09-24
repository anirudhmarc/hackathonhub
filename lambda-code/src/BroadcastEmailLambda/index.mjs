// lambda/broadcast-email/index.js - multi-tenant: scoped to hackathon_id
import { createRequire } from "module";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

// Bridge the CommonJS tenancy layer (/opt/nodejs/tenancy.js) into this ES module.
const require = createRequire(import.meta.url);
const t = require('/opt/nodejs/tenancy');

const sesClient = new SESClient({ region: process.env.SES_REGION || "ap-southeast-1" });
const ddbClient = new DynamoDBClient({ region: process.env.REGION || process.env.AWS_REGION || "us-east-1" });
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || process.env.TABLE_NAME || "HackathonRegistrations";
const SENDER_EMAIL = process.env.SENDER_EMAIL || "admin@greataihackathon.com";
const RATE_LIMIT_PER_SECOND = 12;

// Utility function to introduce a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to fetch all participant emails from DynamoDB, scoped to a hackathon
const fetchEmails = async (trackType, hackathonId) => {
    let emails = [];
    let lastEvaluatedKey;

    do {
        let params = {
            TableName: TABLE_NAME,
            ProjectionExpression: "leader, members, agreeEmailCommunications, #track",
            ExpressionAttributeNames: {
              "#track": "track"
            },
        };

        // Always scope to the requested hackathon.
        const filterClauses = ["hackathon_id = :hackathonId"];
        params.ExpressionAttributeValues = {
            ":hackathonId": { "S": hackathonId }
        };

        if (trackType !== 'all') {
            filterClauses.push("#track = :trackType");
            params.ExpressionAttributeValues[":trackType"] = { "S": trackType };
        }

        params.FilterExpression = filterClauses.join(" AND ");

        if (lastEvaluatedKey) {
            params.ExclusiveStartKey = lastEvaluatedKey;
        }

        const command = new ScanCommand(params);
        const result = await ddbClient.send(command);

        if (result.Items) {
            result.Items.forEach(item => {
                const unmarshalledItem = unmarshall(item);
                // Ensure the user has agreed to receive email communications
                if (unmarshalledItem.agreeEmailCommunications) {
                    // Extract leader's email
                    if (unmarshalledItem.leader && unmarshalledItem.leader.email) {
                        emails.push(unmarshalledItem.leader.email);
                    }
                    // Extract members' emails (handling different formats)
                    if (unmarshalledItem.members) {
                        try {
                            const members = JSON.parse(unmarshalledItem.members);
                            if (Array.isArray(members)) {
                                members.forEach(member => {
                                    if (member && member.email) {
                                        emails.push(member.email);
                                    }
                                });
                            }
                        } catch (e) {
                            console.error("Failed to parse members JSON:", e);
                            // Fallback for simple string arrays
                            if (Array.isArray(unmarshalledItem.members)) {
                                unmarshalledItem.members.forEach(email => {
                                    if (typeof email === 'string') {
                                        emails.push(email);
                                    }
                                });
                            }
                        }
                    }
                }
            });
        }
        lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    // Remove duplicates
    return [...new Set(emails)];
};

export const handler = async (event) => {
    const origin = event.headers?.origin || event.headers?.Origin || "";

    // Set CORS headers
    const responseHeaders = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin, // Use the incoming origin
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Hackathon-Id",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
    };

    if (event.requestContext?.http?.method === "OPTIONS" || event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify({ message: "CORS preflight passed" }),
        };
    }

    // Validate request body
    if (!event.body) {
        return {
            statusCode: 400,
            headers: responseHeaders,
            body: JSON.stringify({ message: "Missing request body" }),
        };
    }

    const parsedBody = JSON.parse(event.body);
    const { subject, body, recipient_type, individual_emails } = parsedBody;

    // Tenant scope comes from the PATH only — never attacker-controlled header/body.
    const hackathonId = event.pathParameters?.hackathonId;
    if (!hackathonId) {
        return {
            statusCode: 400,
            headers: responseHeaders,
            body: JSON.stringify({ message: "Missing hackathon id" }),
        };
    }

    // Authorize: caller must be a host of THIS hackathon (Admins bypass) before any recipient fetch or SES send.
    try {
        const caller = t.getCaller(event);
        const conn = await t.getConnection();
        await t.assertMembership(conn, caller, hackathonId, 'host');
    } catch (err) {
        return {
            statusCode: err?.statusCode || 500,
            headers: responseHeaders,
            body: JSON.stringify({ message: err?.message || "Authorization failed" }),
        };
    }

    if (!subject || !body || !recipient_type) {
        return {
            statusCode: 400,
            headers: responseHeaders,
            body: JSON.stringify({ message: "Missing required fields: subject, body, or recipient_type" }),
        };
    }

    let recipientEmails = [];

    try {
        if (recipient_type === 'individual' && individual_emails && Array.isArray(individual_emails)) {
            // Use the list of individual emails provided
            recipientEmails = individual_emails;
        } else if (recipient_type === 'all') {
            // All participants in this hackathon (no student/corporate distinction).
            recipientEmails = await fetchEmails('all', hackathonId);
        } else {
            return {
                statusCode: 400,
                headers: responseHeaders,
                body: JSON.stringify({ message: "Invalid recipient_type or missing individual_emails for 'individual' type." }),
            };
        }
    } catch (error) {
        console.error("Error fetching emails from DynamoDB:", error);
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ message: "Failed to fetch recipient emails from database." }),
        };
    }

    if (recipientEmails.length === 0) {
        return {
            statusCode: 404,
            headers: responseHeaders,
            body: JSON.stringify({ message: `No recipients found for the selected type: ${recipient_type}.` }),
        };
    }

    // Logging the recipients before sending
    console.log(`Preparing to send email to ${recipientEmails.length} recipients of type "${recipient_type}".`);

    const BATCH_SIZE = RATE_LIMIT_PER_SECOND;
    let successCount = 0;
    let failedCount = 0;

    // Send emails in batches
    for (let i = 0; i < recipientEmails.length; i += BATCH_SIZE) {
        const batch = recipientEmails.slice(i, i + BATCH_SIZE);

        const emailPromises = batch.map(async (email) => {
            const sendEmailParams = {
                Source: SENDER_EMAIL,
                Destination: {
                    ToAddresses: [email],
                },
                Message: {
                    Subject: {
                        Charset: "UTF-8",
                        Data: subject,
                    },
                    Body: {
                        Html: {
                            Charset: "UTF-8",
                            Data: body,
                        },
                    },
                },
            };

            try {
                await sesClient.send(new SendEmailCommand(sendEmailParams));
                console.log(`Email successfully sent to: ${email}`);
                successCount++;
                return true;
            } catch (err) {
                console.error(`Failed to send email to ${email}:`, err);
                failedCount++;
                return false;
            }
        });

        // Wait for all emails in the current batch to be sent
        await Promise.allSettled(emailPromises);

        // Add a delay before sending the next batch to respect the rate limit
        if (i + BATCH_SIZE < recipientEmails.length) {
            console.log(`Pausing for 1 second to respect SES rate limit of ${RATE_LIMIT_PER_SECOND} emails/second.`);
            await delay(1000); // 1 second delay
        }
    }

    const responseMessage = `Broadcast email process completed. ${successCount} emails sent successfully, ${failedCount} failed.`;
    console.log(responseMessage);

    return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify({ message: responseMessage, totalRecipients: recipientEmails.length, successCount, failedCount }),
    };
};
