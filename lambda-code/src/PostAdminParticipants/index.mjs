// post-admin-participants/index.js - FINAL CORRECTED CODE

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { v4 as uuidv4 } from 'uuid';

// Configure AWS SDK clients
// Ensure your DynamoDB table is in this region
const client = new DynamoDBClient({ region: process.env.REGION || "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);

// SES must be in a region where it's generally available, ap-southeast-1 is common
const sesClient = new SESClient({ region: process.env.REGION || process.env.AWS_REGION || "us-east-1" });

// Environment Variables (MUST BE SET IN LAMBDA CONFIGURATION)
// TABLE_NAME: Your DynamoDB table name (e.g., HackathonRegistrations)
// FROM_EMAIL: The verified SES sender email (e.g., noreply@greataihackathon.com)
// ALLOWED_ORIGIN: Your frontend URL (e.g., http://localhost:8080 or https://your-admin-app.com)
const TableName = process.env.DYNAMODB_TABLE_NAME || process.env.DYNAMODB_TABLE_NAME || process.env.TABLE_NAME || "HackathonRegistrations"; // Default for local, ensure set in Lambda Env Vars
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@greataihackathon.com"; // Default, ensure set in Lambda Env Vars
const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:8080"; // Default for local, ensure set in Lambda Env Vars

// Resolve the hackathon scope from path / header / body.
const resolveHackathonId = (event, body) => {
    const pp = event.pathParameters || {};
    if (pp.hackathonId) return pp.hackathonId;
    const h = event.headers || {};
    if (h['X-Hackathon-Id'] || h['x-hackathon-id']) return h['X-Hackathon-Id'] || h['x-hackathon-id'];
    return body?.hackathon_id || null;
};


// Email template function with dynamic recipient name
const generateConfirmationEmail = (registrationData, recipientName) => {
    const { registrationId, teamName, track, leader, members, memberCount, registrationDate } = registrationData;
    
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // HTML template with pending approval message
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Registration Received - Great AI Hackathon 2025</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #232F3E; padding-bottom: 20px; margin-bottom: 20px; }
        .success { background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
        .details { background: #f8f9fa; padding: 20px; border-left: 4px solid #232F3E; margin: 20px 0; }
        .contact-info { background-color: #e3f2fd; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .approval-notice { background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Great AI Hackathon 2025</h1>
        <p>Registration Received</p>
    </div>

    <div class="success">
        <h2>📝 Registration Successfully Submitted!</h2>
    </div>

    <p>Dear <strong>${recipientName}</strong>,</p>
    
    <p>Thank you for your interest in the Great AI Hackathon 2025! Your team registration has been successfully received and is currently under review.</p>

    <div class="approval-notice">
        <h3 style="margin-top: 0; color: #0c5460;">⏳ Pending Admin Approval</h3>
        <p style="margin-bottom: 0;">
            Your registration is currently being reviewed by our admin team. 
            <strong>You will receive another confirmation email once your registration has been approved.</strong>
            This process typically takes 1-2 business days.
        </p>
    </div>

    <div class="details">
        <h3>📋 Registration Details</h3>
        <p><strong>Registration ID:</strong> ${registrationId}</p>
        <p><strong>Team Name:</strong> ${teamName}</p>
        <p><strong>Track:</strong> ${track.toUpperCase()}</p>
        <p><strong>Team Size:</strong> ${memberCount} member${memberCount > 1 ? 's' : ''}</p>
        <p><strong>Submission Date:</strong> ${formatDate(registrationDate)}</p>
    </div>

    <div class="details">
        <h3>👥 Team Leader</h3>
        <p><strong>${leader.name}</strong><br>
        📧 ${leader.email}<br>
        📱 ${leader.mobile || 'N/A'}</p>
        
        ${members && members.length > 0 ? `
        <h3>Team Members</h3>
        ${members.map((member, index) => `
        <p><strong>${member.name}</strong><br>
        📧 ${member.email || 'N/A'}<br>
        📱 ${member.mobile || 'N/A'}</p>
        `).join('')}
        ` : ''}
    </div>

    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>🔔 What's Next?</h3>
        <ul>
            <li>Save your Registration ID: <strong>${registrationId}</strong></li>
            <li><strong>Wait for approval confirmation email</strong> (1-2 business days)</li>
            <li>Check your email regularly for updates</li>
            <li>Event details will be sent after approval</li>
        </ul>
    </div>

    <div class="contact-info">
        <strong>📞 Need Help?</strong><br>
        If you have any questions about your registration status, please contact us:
        <br><br>
        📧 Email: <a href="mailto:admin@greataihackathon.com">admin@greataihackathon.com</a><br>
        🌐 Website: <a href="https://greataihackathon.com">greataihackathon.com</a>
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <div style="font-size: 18px; font-weight: bold; color: #232F3E; margin-bottom: 10px;">
            🎯 Thank You for Your Interest!
        </div>
        <p style="color: #666;">We appreciate your participation and will review your registration promptly.</p>
    </div>

    <div class="footer">
        <p>
            This is an automated acknowledgment email for the Great AI Hackathon 2025.<br>
            © 2025 APU AWS Cloud Club. All rights reserved.
        </p>
    </div>
</body>
</html>`;

    // Text template with pending approval message
    const textTemplate = `
Great AI Hackathon 2025 - Registration Received

Dear ${recipientName},

Thank you for your interest in the Great AI Hackathon 2025! Your team registration has been successfully received and is currently under review.

PENDING ADMIN APPROVAL:
Your registration is currently being reviewed by our admin team. You will receive another confirmation email once your registration has been approved. This process typically takes 1-2 business days.

REGISTRATION DETAILS:
- Registration ID: ${registrationId}
- Team Name: ${teamName}
- Track: ${track.toUpperCase()}
- Team Size: ${memberCount} member${memberCount > 1 ? 's' : ''}
- Submission Date: ${formatDate(registrationDate)}

TEAM LEADER:
${leader.name}
Email: ${leader.email}
Mobile: ${leader.mobile || 'N/A'}

${members && members.length > 0 ? `
TEAM MEMBERS:
${members.map((member, index) => `
${index + 1}. ${member.name}
   Email: ${member.email || 'N/A'}
   Mobile: ${member.mobile || 'N/A'}
`).join('')}` : ''}

WHAT'S NEXT?
- Save your Registration ID: ${registrationId}
- Wait for approval confirmation email (1-2 business days)
- Check your email regularly for updates
- Event details will be sent after approval

CONTACT:
If you have questions about your registration status:
Email: admin@greataihackathon.com
Website: https://greataihackathon.com

Thank you for your interest! We will review your registration promptly.

Best regards,
Great AI Hackathon 2025 Team
APU AWS Cloud Club
`;

    return { htmlTemplate, textTemplate };
};

// Function to send personalized confirmation emails
const sendConfirmationEmails = async (registrationData) => {
    const { leader, members, emails } = registrationData; // 'emails' here is the combined array from the input

    // Create array of recipients with their names and emails
    const recipients = [];

    // Add leader
    recipients.push({ name: leader.name, email: leader.email, role: 'Team Leader' });

    // Add members from the 'members' array (names only)
    // and try to match their emails from the 'emails' array from input
    // This assumes `emails` contains all team emails and their order roughly corresponds.
    // For more robust matching, member objects would ideally carry their own email.
    const nonLeaderEmails = new Set(emails.filter(e => e !== leader.email)); // Get all emails not the leader's
    
    if (members && members.length > 0) {
        members.forEach((member) => {
            // Find an unused email for this member. This is a heuristic.
            let memberEmail = null;
            if (nonLeaderEmails.size > 0) {
                memberEmail = nonLeaderEmails.values().next().value; // Take the first available
                nonLeaderEmails.delete(memberEmail); // Mark as used
            }
            
            recipients.push({ 
                name: member.name, 
                email: memberEmail || 'N/A', // Use found email or N/A
                role: `Team Member` 
            });
        });
    }

    console.log(`Attempting to send personalized emails to: ${recipients.map(r => `${r.name} (${r.email})`).join(', ')}`);

    const emailPromises = recipients.map(async (recipient) => {
        // Only send email if a valid email address is present
        if (!recipient.email || typeof recipient.email !== 'string' || recipient.email.trim() === '' || recipient.email === 'N/A') {
            console.warn(`Skipping email for ${recipient.name} due to invalid, missing, or 'N/A' email address.`);
            return { email: recipient.email, name: recipient.name, success: false, error: 'Invalid or missing email address.' };
        }

        // Generate personalized email for each recipient
        const { htmlTemplate, textTemplate } = generateConfirmationEmail(registrationData, recipient.name);
        
        const emailParams = {
            Source: FROM_EMAIL, // Use the FROM_EMAIL env var
            Destination: {
                ToAddresses: [recipient.email],
            },
            Message: {
                Subject: {
                    Data: `Registration Received - Great AI Hackathon 2025 | Team: ${registrationData.teamName}`,
                    Charset: "UTF-8",
                },
                Body: {
                    Html: {
                        Data: htmlTemplate,
                        Charset: "UTF-8",
                    },
                    Text: {
                        Data: textTemplate,
                        Charset: "UTF-8",
                    },
                },
            },
        };

        try {
            console.log(`Sending personalized email to ${recipient.name} (${recipient.email})...`);
            const result = await sesClient.send(new SendEmailCommand(emailParams));
            console.log(`Email sent successfully to ${recipient.name}:`, result.MessageId);
            return { email: recipient.email, name: recipient.name, success: true, messageId: result.MessageId };
        } catch (error) {
            console.error(`Failed to send email to ${recipient.name} (${recipient.email}):`, error);
            return { email: recipient.email, name: recipient.name, success: false, error: error.message };
        }
    });

    // Set a timeout for email sending (20 seconds max)
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 20000)
    );

    try {
        return await Promise.race([
            Promise.all(emailPromises),
            timeoutPromise
        ]);
    } catch (error) {
        console.error("Email sending timeout or general error:", error);
        return recipients.map(recipient => ({ 
            email: recipient.email, 
            name: recipient.name,
            success: false, 
            error: 'Timeout or service error during email sending' 
        }));
    }
};

export const handler = async (event) => {
    console.info("RAW EVENT:", JSON.stringify(event, null, 2));

    const origin = event.headers?.origin || event.headers?.Origin || "";

    const responseHeaders = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin, // Use the configured allowedOrigin
        "Access-Control-Allow-Headers": "Content-Type,Authorization", // Added Authorization header for completeness
        "Access-Control-Allow-Methods": "POST,OPTIONS",
    };

    if (event.requestContext?.http?.method === "OPTIONS") {
        console.log("Handling CORS preflight request");
        return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify({ message: "CORS preflight passed" }),
        };
    }

    try {
        console.log("Processing admin add participant request...");
        
        if (!event.body) {
            console.error("No request body found");
            return {
                statusCode: 400,
                headers: responseHeaders,
                body: JSON.stringify({ message: "Missing request body" }),
            };
        }

        const data = JSON.parse(event.body);
        console.log("Parsed request data:", JSON.stringify(data, null, 2));

        const { 
            teamName, 
            track, 
            leader, // This will be the object { name, email, mobile, etc... }
            members, // This will be an array of member objects (only 'name' expected now)
            emails, // This will be an array of email strings (all emails from the frontend's comma-separated input)
            agreeTermsConditions, 
            agreeEmailCommunications,
            agreeMarketingEmails
        } = data;

        // Resolve the hackathon scope (path / header / body). Required for multi-tenant writes.
        const hackathonId = resolveHackathonId(event, data);
        if (!hackathonId) {
            console.error("Missing hackathon id");
            return {
                statusCode: 400,
                headers: responseHeaders,
                body: JSON.stringify({ message: 'Missing hackathon id' }),
            };
        }

        // Calculate memberCount based on actual leader and members
        const memberCount = 1 + (members?.length || 0);

        // Validate required top-level fields
        if (!teamName || !track || !leader || !leader.name || !leader.email) {
            console.error("Missing core required fields: teamName, track, leader.name, or leader.email");
            return {
                statusCode: 400,
                headers: responseHeaders,
                body: JSON.stringify({ 
                    message: "Missing core required fields: teamName, track, leader (name/email)" 
                }),
            };
        }

        // Validate agreement fields (required checkboxes - assume admin sets them true)
        if (!agreeTermsConditions || !agreeEmailCommunications) {
            console.error("Missing required agreements (Terms & Communications)");
            return {
                statusCode: 400,
                headers: responseHeaders,
                body: JSON.stringify({ 
                    message: "Admin must ensure agreement to Terms and Conditions and email communications" 
                }),
            };
        }

        // === UNIQUENESS VALIDATION ===
        console.log("Starting uniqueness validation...");
        
        // Get all existing registrations to check for duplicates
        const scanCommand = new ScanCommand({
            TableName: TableName,
            ProjectionExpression: "participant_id, teamName, emails, leader, members" // Include 'participant_id' for logging/debugging if needed
        });
        
        const existingRegistrations = await docClient.send(scanCommand);
        console.log(`Found ${existingRegistrations.Items?.length || 0} existing registrations`);

        // Collect all current emails and names from the new submission
        // Use the 'emails' array from the input directly, it should contain all emails.
        const currentEmails = (emails || []).filter(email => typeof email === 'string' && email.trim() !== '');
        // For 'names', combine leader name and member names.
        const currentNames = [leader.name, ...(members || []).map(m => m.name)].filter(name => typeof name === 'string' && name.trim() !== '');
        
        console.log("New registration data for uniqueness check:", {
            teamName,
            emails: currentEmails,
            names: currentNames
        });

        // Check for duplicates
        const duplicateChecks = {
            teamName: false,
            emails: [],
            names: []
        };

        if (existingRegistrations.Items) {
            for (const registration of existingRegistrations.Items) {
                // Check team name (case-insensitive)
                if (registration.teamName && 
                    typeof registration.teamName === 'string' && 
                    registration.teamName.toLowerCase() === teamName.toLowerCase()) {
                    duplicateChecks.teamName = true;
                    console.log(`Duplicate team name found: ${registration.teamName} (ID: ${registration.participant_id})`);
                }

                // Check emails (can be array or single string from older entries)
                const existingEmails = Array.isArray(registration.emails) 
                    ? registration.emails 
                    : (registration.emails ? [registration.emails] : []); // Handles case where it's single string or null/undefined
                
                const cleanedExistingEmails = existingEmails.filter(email => typeof email === 'string' && email.trim() !== '');

                for (const email of currentEmails) { 
                    if (cleanedExistingEmails.some(existingEmail => 
                        existingEmail.toLowerCase() === email.toLowerCase())) {
                        duplicateChecks.emails.push(email);
                        console.log(`Duplicate email found: ${email} (from existing ID: ${registration.participant_id})`);
                    }
                }

                // Parse existing leader and members data robustly
                let existingLeaderData = registration.leader;
                if (typeof existingLeaderData === 'string' && existingLeaderData.trim() !== '') {
                    try {
                        existingLeaderData = JSON.parse(existingLeaderData);
                    } catch (e) {
                        console.warn(`Failed to parse existing leader data for ID ${registration.participant_id} (malformed JSON string):`, existingLeaderData, e);
                        existingLeaderData = {}; // Default to empty object on parse failure
                    }
                } else if (existingLeaderData === null || existingLeaderData === undefined) {
                    existingLeaderData = {}; // Handle null/undefined leader in DB
                }
                
                let existingMembersData = registration.members;
                if (typeof existingMembersData === 'string' && existingMembersData.trim() !== '') {
                    try {
                        existingMembersData = JSON.parse(existingMembersData);
                    } catch (e) {
                        console.warn(`Failed to parse existing members data for ID ${registration.participant_id} (malformed JSON string):`, existingMembersData, e);
                        existingMembersData = []; // Default to empty array on parse failure
                    }
                } else if (existingMembersData === null || existingMembersData === undefined) {
                    existingMembersData = []; // Handle null/undefined members in DB
                }

                // Ensure existingMembersData is an array for safety
                existingMembersData = Array.isArray(existingMembersData) ? existingMembersData : [];
                
                const namesFromExistingEntry = [];
                // Extract leader name
                if (existingLeaderData && typeof existingLeaderData === 'object' && existingLeaderData.name && typeof existingLeaderData.name === 'string' && existingLeaderData.name.trim() !== '') {
                    namesFromExistingEntry.push(existingLeaderData.name);
                }
                // Extract member names
                existingMembersData.forEach(member => {
                    if (member && typeof member === 'object' && member.name && typeof member.name === 'string' && member.name.trim() !== '') {
                        namesFromExistingEntry.push(member.name);
                    } else if (typeof member === 'string' && member.trim() !== '') { // Handle cases where old 'members' were just plain name strings
                        namesFromExistingEntry.push(member);
                    }
                });

                // Check for name duplicates (case-insensitive)
                for (const name of currentNames) {
                    if (namesFromExistingEntry.some(existingName => 
                        typeof existingName === 'string' && existingName.toLowerCase() === name.toLowerCase())) {
                        duplicateChecks.names.push(name);
                        console.log(`Duplicate name found: ${name} (from existing ID: ${registration.participant_id})`);
                    }
                }
            }
        }

        // Report all duplicate errors
        const duplicateErrors = [];
        
        if (duplicateChecks.teamName) {
            duplicateErrors.push(`Team name "${teamName}" is already registered`);
        }
        
        if (duplicateChecks.emails.length > 0) {
            const uniqueEmails = [...new Set(duplicateChecks.emails)];
            duplicateErrors.push(`Email(s) already registered: ${uniqueEmails.join(', ')}`);
        }
        
        if (duplicateChecks.names.length > 0) {
            const uniqueNames = [...new Set(duplicateChecks.names)];
            duplicateErrors.push(`Participant name(s) already registered: ${uniqueNames.join(', ')}`);
        }

        if (duplicateErrors.length > 0) {
            console.error("Duplicate data found:", duplicateErrors);
            return {
                statusCode: 409, // Conflict status code
                headers: responseHeaders,
                body: JSON.stringify({ 
                    message: "Registration failed due to duplicate data",
                    errors: duplicateErrors
                }),
            };
        }

        console.log("Uniqueness validation passed");

        // === CONTINUING WITH DETAILED FIELD VALIDATION (Admin-specific, less strict for members) ===
        
        // Define required fields specifically for Admin Add
        const getAdminRequiredFields = (isLeader) => {
            // Leader *must* have name and email for basic contact and potential Cognito setup.
            // Members (non-leaders) only need a 'name' property, as their emails are provided in the separate 'emails' array.
            if (isLeader) {
                return ["name", "email"]; 
            } else {
                return ["name"]; 
            }
        };

        // Validate leader's detailed fields
        const leaderRequiredFields = getAdminRequiredFields(true);
        for (const field of leaderRequiredFields) {
            if (!leader?.[field] && leader?.[field] !== 0 && leader?.[field] !== false) {
                console.error(`Leader missing required field: ${field}`);
                return {
                    statusCode: 400,
                    headers: responseHeaders,
                    body: JSON.stringify({ 
                        message: `Leader is missing required field: ${field}` 
                    }),
                };
            }
        }

        // Validate all members (if any)
        if (members && members.length > 0) {
            const memberRequiredFields = getAdminRequiredFields(false); // Get fields required for members
            for (let i = 0; i < members.length; i++) {
                const member = members[i];
                
                for (const field of memberRequiredFields) { 
                    if (!member?.[field] && member?.[field] !== 0 && member?.[field] !== false) {
                        console.error(`Member ${i + 1} missing required field: ${field}`);
                        return {
                            statusCode: 400,
                            headers: responseHeaders,
                            body: JSON.stringify({ 
                                message: `Member ${i + 1} is missing required field: ${field}` 
                            }),
                        };
                    }
                }
            }
        }

        console.log("All data validations passed.");

        // Generate unique registration ID and timestamp
        const registrationId = `REG_${Date.now()}_${uuidv4().substring(0, 9)}`; // Shorter UUID for ID
        const timestamp = new Date().toISOString();

        console.log("Generated registration ID:", registrationId);

        // Prepare the 'emails' array for DynamoDB:
        // Combine leader's email with other provided emails, and remove duplicates.
        // This ensures the DB 'emails' field contains *all* emails associated with the team.
        const allEmailsForDB = [...new Set([leader.email, ...(emails || [])])].filter(email => typeof email === 'string' && email.trim() !== '');

        // Create the record for DynamoDB, ensuring complex objects are stringified
        // and members are stored as an array of objects with only 'name'
        const registrationRecord = {
            id: registrationId, // Primary key for the id-keyed HackathonRegistrations table
            participant_id: registrationId, // Kept for backwards compatibility with older readers
            hackathon_id: hackathonId, // Multi-tenant scope
            teamName,
            track,
            memberCount,
            leader: JSON.stringify(leader), // Store leader object as JSON string
            members: JSON.stringify(members || []), // Store members array as JSON string
            emails: allEmailsForDB, // Store all unique, valid emails as a List (String Set in DynamoDB)
            agreeTermsConditions: agreeTermsConditions || false,
            agreeEmailCommunications: agreeEmailCommunications || false,
            agreeMarketingEmails: agreeMarketingEmails || false,
            submittedAt: timestamp,
            status: "PENDING_APPROVAL" // Always pending approval on initial creation
        };

        console.log("Prepared record for DynamoDB:", JSON.stringify(registrationRecord, null, 2));

        // Save to DynamoDB
        const putCommand = new PutCommand({
            TableName: TableName,
            Item: registrationRecord
        });

        console.log("Executing DynamoDB PutCommand...");
        await docClient.send(putCommand);
        console.log(`Successfully saved registration: ${registrationId}`);

        // Send confirmation emails
        console.log("Sending confirmation emails...");
        let emailResults = [];
        try {
            // Pass the original relevant data for email sending, including the combined 'emails' list
            emailResults = await sendConfirmationEmails({
                registrationId,
                teamName,
                track,
                memberCount,
                leader,
                members, // Pass members for template rendering (names only)
                emails: allEmailsForDB, // Pass the *combined and cleaned* list of emails for sending
                registrationDate: timestamp
            });
            console.log("Email sending completed:", emailResults);
        } catch (emailError) {
            console.error("Email sending failed during admin add:", emailError);
            emailResults = allEmailsForDB.map(email => ({ 
                email, 
                success: false, 
                error: emailError.message 
            }));
        }

        // Prepare response
        const responseData = {
            success: true,
            message: "Participant added successfully and pending admin approval",
            registrationId,
            teamName,
            track,
            memberCount,
            registrationDate: timestamp,
            status: "PENDING_APPROVAL",
            emailResults: emailResults
        };

        console.log("Returning success response:", JSON.stringify(responseData, null, 2));

        return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify(responseData),
        };

    } catch (err) {
        console.error("Lambda error:", err);
        console.error("Error stack:", err.stack);
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ 
                message: "Internal server error during participant addition", 
                error: err.message 
            }),
        };
    }
};
