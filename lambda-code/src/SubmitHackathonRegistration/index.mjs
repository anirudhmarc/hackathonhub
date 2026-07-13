import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const client = new DynamoDBClient({ region: process.env.REGION || process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
// Use ap-southeast-1 for SES
const sesClient = new SESClient({ region: "ap-southeast-1" });
const allowedOrigin = "https://greataihackathon.com";

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
        📱 ${leader.mobile}</p>
        
        ${members && members.length > 0 ? `
        <h3>Team Members</h3>
        ${members.map((member, index) => `
        <p><strong>${member.name}</strong><br>
        📧 ${member.email}<br>
        📱 ${member.mobile}</p>
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
Mobile: ${leader.mobile}

${members && members.length > 0 ? `
TEAM MEMBERS:
${members.map((member, index) => `
${index + 1}. ${member.name}
   Email: ${member.email}
   Mobile: ${member.mobile}
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
  const { leader, members } = registrationData;
  
  // Create array of recipients with their names
  const recipients = [
    { name: leader.name, email: leader.email, role: 'Team Leader' }
  ];
  
  if (members && members.length > 0) {
    members.forEach((member, index) => {
      recipients.push({ 
        name: member.name, 
        email: member.email, 
        role: `Team Member ${index + 1}` 
      });
    });
  }

  console.log(`Attempting to send personalized emails to: ${recipients.map(r => `${r.name} (${r.email})`).join(', ')}`);

  const emailPromises = recipients.map(async (recipient) => {
    // Generate personalized email for each recipient
    const { htmlTemplate, textTemplate } = generateConfirmationEmail(registrationData, recipient.name);
    
    const emailParams = {
      Source: process.env.FROM_EMAIL || "noreply@greataihackathon.com",
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
    console.error('Email sending timeout or error:', error);
    return recipients.map(recipient => ({ 
      email: recipient.email, 
      name: recipient.name,
      success: false, 
      error: 'Timeout or service error' 
    }));
  }
};

export const handler = async (event) => {
  console.info("RAW EVENT:", JSON.stringify(event, null, 2));

  const origin = event.headers?.origin || event.headers?.Origin || "";

  const responseHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
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
    console.log("Processing registration request...");
    
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
      hackathon_id,
      teamName,
      memberCount,
      leader,
      members,
      agreeTermsConditions,
      agreeEmailCommunications,
      agreeMarketingEmails
    } = data;

    // Track is no longer a student/corporate choice — there's just one participant
    // pool. Accept an optional label for backward compatibility, else default it.
    const track = data.track || "general";

    // Multi-tenant: a registration must target a specific hackathon.
    const hackathonId = hackathon_id || event.pathParameters?.hackathonId;
    if (!hackathonId) {
      return {
        statusCode: 400,
        headers: responseHeaders,
        body: JSON.stringify({ message: 'Missing hackathon_id — registrations must target a hackathon.' }),
      };
    }

    // Validate required top-level fields
    if (!teamName || !memberCount || !leader) {
      console.error("Missing required fields");
      return {
        statusCode: 400,
        headers: responseHeaders,
        body: JSON.stringify({
          message: "Missing required fields: teamName, memberCount, or leader"
        }),
      };
    }

    // Validate agreement fields (required checkboxes)
    if (!agreeTermsConditions || !agreeEmailCommunications) {
      console.error("Missing required agreements");
      return {
        statusCode: 400,
        headers: responseHeaders,
        body: JSON.stringify({ 
          message: "You must agree to the Terms and Conditions and email communications" 
        }),
      };
    }

    // === UNIQUENESS VALIDATION ===
    console.log("Starting uniqueness validation...");
    
    // Get all existing registrations
    const scanCommand = new ScanCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME || process.env.TABLE_NAME || "HackathonRegistrations",
      ProjectionExpression: "teamName, emails, leader, members"
    });
    
    const existingRegistrations = await docClient.send(scanCommand);
    console.log(`Found ${existingRegistrations.Items?.length || 0} existing registrations`);

    // Collect all current emails and names
    const currentEmails = [leader.email, ...(members || []).map(m => m.email)];
    const currentNames = [leader.name, ...(members || []).map(m => m.name)];
    
    console.log("Current registration data:", {
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
            registration.teamName.toLowerCase() === teamName.toLowerCase()) {
          duplicateChecks.teamName = true;
          console.log("Duplicate team name found:", registration.teamName);
        }

        // Check emails
        if (registration.emails) {
          const existingEmails = Array.isArray(registration.emails) 
            ? registration.emails 
            : [registration.emails];
          
          for (const email of currentEmails) {
            if (existingEmails.some(existingEmail => 
                existingEmail.toLowerCase() === email.toLowerCase())) {
              duplicateChecks.emails.push(email);
              console.log("Duplicate email found:", email);
            }
          }
        }

        // Check names from leader and members (stored as JSON strings)
        const existingNames = [];
        
        // Extract leader name
        if (registration.leader) {
          try {
            const leaderData = JSON.parse(registration.leader);
            if (leaderData.name) {
              existingNames.push(leaderData.name);
            }
          } catch (e) {
            console.warn("Failed to parse leader data:", e);
          }
        }
        
        // Extract member names
        if (registration.members) {
          try {
            const membersData = JSON.parse(registration.members);
            if (Array.isArray(membersData)) {
              membersData.forEach(member => {
                if (member.name) {
                  existingNames.push(member.name);
                }
              });
            }
          } catch (e) {
            console.warn("Failed to parse members data:", e);
          }
        }

        // Check for name duplicates (case-insensitive)
        for (const name of currentNames) {
          if (existingNames.some(existingName => 
              existingName.toLowerCase() === name.toLowerCase())) {
            duplicateChecks.names.push(name);
            console.log("Duplicate name found:", name);
          }
        }
      }
    }

    // Check if any duplicates were found
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

    // === FIELD VALIDATION ===

    // Helper function to validate a person (leader or member)
    const validatePerson = (person, personType) => {
      console.log(`Validating ${personType}:`, JSON.stringify(person, null, 2));

      // Clean up the person data before validation
      const cleanPerson = {
        ...person,
        // Ensure food allergy is never null/undefined
        foodAllergy: person.foodAllergy || "",
        // Normalize case-sensitive fields
        pwd: person.pwd || "",
        bumiputera: person.bumiputera || "",
        gender: person.gender || "",
      };

      console.log(`Cleaned ${personType} data:`, JSON.stringify(cleanPerson, null, 2));

      // Required fields for every participant (no student/corporate distinction).
      const requiredFields = [
        "name", "email", "mobile", "tshirtSize", "nationality",
        "ethnic", "gender", "pwd", "bumiputera", "foodOption"
      ];

      // Check basic required fields (skip foodAllergy as it's optional)
      for (const field of requiredFields) {
        const value = cleanPerson[field];

        // Special handling for boolean-like fields
        if (field === "pwd" || field === "bumiputera") {
          if (value !== "Yes" && value !== "No") {
            console.error(`${personType} invalid value for ${field}: "${value}"`);
            return {
              isValid: false,
              message: `${personType}: ${field} must be either "Yes" or "No", got "${value}"`
            };
          }
        } else if (!value && value !== 0 && value !== false) {
          console.error(`${personType} missing required field: ${field}, got: "${value}"`);
          return {
            isValid: false,
            message: `${personType} is missing required field: ${field}`
          };
        }
      }

      return { isValid: true };
    };

    // ✅ ADD THIS: Validate leader first
    const leaderValidation = validatePerson(leader, "Leader");
    if (!leaderValidation.isValid) {
      return {
        statusCode: 400,
        headers: responseHeaders,
        body: JSON.stringify({ message: leaderValidation.message }),
      };
    }

    // Validate member count matches actual members
    const actualMemberCount = 1 + (members?.length || 0);
    if (actualMemberCount !== memberCount) {
      console.error("Member count mismatch");
      return {
        statusCode: 400,
        headers: responseHeaders,
        body: JSON.stringify({
          message: `Member count mismatch: expected ${memberCount}, got ${actualMemberCount}`,
        }),
      };
    }

    // Validate all members (if any)
    if (members && members.length > 0) {
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        const memberValidation = validatePerson(member, `Member ${i + 1}`);
        
        if (!memberValidation.isValid) {
          return {
            statusCode: 400,
            headers: responseHeaders,
            body: JSON.stringify({ message: memberValidation.message }),
          };
        }
      }
    }

    console.log("All validations passed. Creating registration...");

    // Generate unique registration ID
    const registrationId = `REG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    console.log("Generated registration ID:", registrationId);

    // Collect all emails for easy querying
    const allEmails = [leader.email, ...(members || []).map(m => m.email)];

    // Create single record for existing table structure
    const registrationRecord = {
      participant_id: registrationId,
      hackathon_id: hackathonId,
      teamName,
      track,
      memberCount,
      leader: JSON.stringify(leader),
      members: JSON.stringify(members || []),
      emails: allEmails,
      agreeTermsConditions: agreeTermsConditions || false,
      agreeEmailCommunications: agreeEmailCommunications || false,
      agreeMarketingEmails: agreeMarketingEmails || false,
      submittedAt: timestamp,
      status: "PENDING_APPROVAL"
    };

    console.log("Prepared record:", JSON.stringify(registrationRecord, null, 2));

    // Save to DynamoDB using existing table structure
    const putCommand = new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME || process.env.TABLE_NAME || "HackathonRegistrations",
      Item: registrationRecord
    });

    console.log("Executing DynamoDB operation...");
    await docClient.send(putCommand);

    console.log(`Successfully saved registration: ${registrationId}`);

    // Send confirmation emails
    console.log("Sending confirmation emails...");
    let emailResults = [];
    
    try {
      emailResults = await sendConfirmationEmails({
        registrationId,
        teamName,
        track,
        memberCount,
        leader,
        members,
        registrationDate: timestamp
      });
      console.log("Email sending completed:", emailResults);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      emailResults = allEmails.map(email => ({ 
        email, 
        success: false, 
        error: emailError.message 
      }));
    }

    // Prepare response
    const responseData = {
      success: true,
      message: "Registration received and pending admin approval",
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
        message: "Internal server error", 
        error: err.message 
      }),
    };
  }
};