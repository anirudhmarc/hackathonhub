import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentHackathon } from '@/contexts/CurrentHackathonContext';
import NoHackathonSelected from '@/components/NoHackathonSelected';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Eye, Users, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import DOMPurify from 'dompurify';

const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_URL;

const JUDGE_CREDENTIALS_TEMPLATE = `<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td style="padding: 20px 0 30px 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; border: 2px solid #b0b0b0; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td align="center" style="padding: 40px 0 30px 0; background-color: #1a1a2e; color: #fff;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">AWS Hackathon</h1>
              <p style="margin: 0; font-size: 16px; margin-top: 5px; color: #e0e0e0;">Judge Credentials</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px 0 30px; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #888888;">
                This is a no-reply email. Please do not reply to this message.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px 40px 30px;">
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #333333;">
                Dear Judge,
              </p>
              <br/>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #333333;">
                Thank you for your valuable support in the AWS Hackathon. Your expertise is crucial to the success of this event.
              </p>
              <br/>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #333333;">
                Here are your personal login credentials for the judging platform. Please keep them secure and do not share them.
              </p>
              <br/>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #f9f9f9; border-radius: 6px; padding: 20px; border: 1px solid #e5e5e5;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="font-size: 16px; margin: 0; line-height: 24px; color: #555555;"><strong>Email:</strong> [email]</p>
                    <p style="font-size: 16px; margin: 0; line-height: 24px; color: #555555;"><strong>Password:</strong> (sent separately for security)</p>
                  </td>
                </tr>
              </table>
              <br/>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #333333;">
                You can access the judging platform by clicking the button below. Please log in to familiarize yourself with the interface.
              </p>
              <br/>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="https://judge.greataihackathon.com/" style="text-decoration: none; display: inline-block;">
                      <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                        <tr>
                          <td align="center" style="background-color: #007bff; border-radius: 50px; padding: 12px 24px;">
                            <a href="https://judge.greataihackathon.com/" style="color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; line-height: 1;">Go to Judging Website</a>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
              </table>
              <br/>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #333333;">
                If you encounter any issues or need to chat with us, you can contact our support team via WhatsApp.
              </p>
              <br/>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="https://wa.me/601129247330" style="text-decoration: none; display: inline-block;">
                      <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                        <tr>
                          <td align="center" style="background-color: #25d366; border-radius: 50px; padding: 12px 24px;">
                            <a href="https://wa.me/601129247330" style="color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; line-height: 1;">Chat on WhatsApp</a>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
              </table>
              <br/>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #333333;">
                Thank you once again for your commitment.
              </p>
              <br/>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #333333;">
                Best regards,<br/>
                AWS Hackathon Team
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px 0; background-color: #1a1a2e; color: #e0e0e0; font-size: 14px;">
              &copy; 2026 AWS Hackathon. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>`;

const JUDGE_CREDENTIALS_FINAL_TEMPLATE = `<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td style="padding: 20px 0 30px 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; border: 2px solid #b0b0b0; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td align="center" style="padding: 40px 0 30px 0; background-color: #1a1a2e; color: #fff;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">AWS Hackathon</h1>
              <p style="margin: 0; font-size: 16px; margin-top: 5px; color: #e0e0e0;">Final Round Judge Invitation & Credentials</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px 0 30px; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #888888;">
                This is a no-reply email. Please do not reply to this message.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px 40px 30px;">
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #333333;">
                Dear Judge,
              </p>
              <br/>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #333333;">
                Thank you once again for your dedication during the preliminary round. We are pleased to invite you to serve as a judge for the <strong>Final Round</strong> of the AWS Hackathon! Your continued expertise is highly valued.
              </p>
              <br/>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #333333;">
                Your login credentials for the judging platform <strong>remain the same</strong> as those used for the preliminary round.
              </p>
              <br/>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #f9f9f9; border-radius: 6px; padding: 20px; border: 1px solid #e5e5e5;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="font-size: 16px; margin: 0; line-height: 24px; color: #555555;"><strong>Email:</strong> [email]</p>
                    <p style="font-size: 16px; margin: 0; line-height: 24px; color: #555555;"><strong>Password:</strong> Your existing password</p>
                  </td>
                </tr>
              </table>
              <br/>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #333333;">
                Please log in to the judging platform to review the finalists.
              </p>
              <br/>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="https://judge.greataihackathon.com/" style="text-decoration: none; display: inline-block;">
                      <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                        <tr>
                          <td align="center" style="background-color: #007bff; border-radius: 50px; padding: 12px 24px;">
                            <a href="https://judge.greataihackathon.com/" style="color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; line-height: 1;">Go to Judging Website</a>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
              </table>
              <br/>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #333333;">
                If you encounter any issues logging in, or have forgotten your updated password, please contact our support team via WhatsApp.
              </p>
              <br/>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="https://wa.me/601129247330" style="text-decoration: none; display: inline-block;">
                      <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                        <tr>
                          <td align="center" style="background-color: #25d366; border-radius: 50px; padding: 12px 24px;">
                            <a href="https://wa.me/601129247330" style="color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; line-height: 1;">Chat on WhatsApp</a>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
              </table>
              <br/>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #333333;">
                Thank you for your commitment to the Final Round.
              </p>
              <br/>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #333333;">
                Best regards,<br/>
                AWS Hackathon Team
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px 0; background-color: #1a1a2e; color: #e0e0e0; font-size: 14px;">
              &copy; 2026 AWS Hackathon. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>`;

const FEEDBACK_FORM_TEMPLATE = `<body style="font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="650" style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e0e0e0; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                    
                    <tr>
                        <td style="background-color: #1c2732; color: #ffffff; padding: 40px 50px; text-align: center; border-bottom: 4px solid #f39c12;">
                            <p style="font-size: 14px; font-weight: 500; margin: 0 0 5px 0; color: #bbbbbb; letter-spacing: 2px; text-transform: uppercase;">Workshop Feedback</p>
                            <h1 style="font-size: 30px; font-weight: 700; margin: 0; letter-spacing: 0.8px;">AWS Hackathon</h1>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px 50px; color: #333333;">
                            <p style="font-size: 16px; line-height: 1.7; margin-top: 0; margin-bottom: 25px;">
                                Dear AWS Hackathon Participant,
                            </p>
                            <p style="font-size: 16px; line-height: 1.7; margin-bottom: 35px;">
                                Thank you for being a part of the Hackathon journey! With the first round finished and our workshops concluded, we would greatly appreciate your feedback on the session <strong>[Workshop Title]</strong>.
                            </p>

                            <div style="background-color: #f9f9f9; border-radius: 8px; padding: 25px; margin-bottom: 40px; border-left: 5px solid #007bff; border-right: 1px solid #e0e0e0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                                <h2 style="font-size: 22px; font-weight: 700; color: #007bff; margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid #eeeeee; padding-bottom: 10px;">Your Feedback is Essential</h2>
                                <p style="font-size: 16px; line-height: 1.7; margin-bottom: 15px;">
                                    Please click on the link below that best reflects your participation status for the <strong>[Workshop Title]</strong> session. Your insights will help us refine and improve future events.
                                </p>
                            </div>
                            

                            <h2 style="font-size: 20px; font-weight: 700; color: #1c2732; margin-top: 30px; margin-bottom: 20px; text-align: center;">Select Your Participation Status</h2>

                            <div style="text-align: center; margin: 40px 0;">
                                
                                <a href="[Link to Attended Feedback Form for This Workshop]"  
                                   style="background-color: #f39c12; color: #1c2732; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 18px; display: block; margin: 15px auto; max-width: 350px; border: 2px solid #e67e22; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                                    I <strong>ATTENDED</strong> THE WORKSHOP
                                </a>
                                
                                <a href="[Link to Did Not Attend Feedback Form for This Workshop]"  
                                   style="background-color: #e0e0e0; color: #333333; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 18px; display: block; margin: 15px auto; max-width: 350px; border: 2px solid #cccccc; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    I <strong>DID NOT ATTEND</strong> (Registered Only)
                                </a>

                            </div>

                            <p style="font-size: 16px; line-height: 1.7; margin-top: 35px; margin-bottom: 30px; padding: 18px; background-color: #fcfcfc; border-left: 5px solid #2ecc71; color: #1c2732; border-radius: 6px;">
                                The Hackathon organizing committee is dedicated to providing high-quality learning experiences. Your candid responses will directly influence the development of future resources.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color: #f7f7f7; padding: 30px 50px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="font-size: 14px; color: #777; margin: 0 0 5px 0;">
                                Thank you for helping us make the AWS Hackathon even better!
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>`;

const BroadcastEmailPage: React.FC = () => {
  const { idToken } = useAuth();
  const { currentHackathonId } = useCurrentHackathon();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'custom' | 'template' | 'feedback'>('custom');
  const [formState, setFormState] = useState({
    subject: '',
    htmlBody: '',
    recipientType: 'individual',
    individualEmails: '',
  });

  const [templateFormState, setTemplateFormState] = useState({
    emails: '',
    subject: 'AWS Hackathon - Judge Credentials',
    judgeRound: 'preliminary' as 'preliminary' | 'final',
  });

  const [feedbackFormState, setFeedbackFormState] = useState({
    emails: '',
    subject: 'Feedback: [Workshop Title] – AWS Hackathon',
    workshopTitle: '',
    attendedFeedbackLink: '',
    notAttendedFeedbackLink: '',
  });

  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [showFeedbackPreview, setShowFeedbackPreview] = useState(false);

  const isFormValid = useMemo(() => {
    if (!formState.subject || !formState.htmlBody) {
      return false;
    }
    if (formState.recipientType === 'individual' && !formState.individualEmails) {
      return false;
    }
    return true;
  }, [formState]);

  const isTemplateFormValid = useMemo(() => {
    return templateFormState.subject.trim() !== '' && templateFormState.emails.trim() !== '';
  }, [templateFormState]);

  const isFeedbackFormValid = useMemo(() => {
    return feedbackFormState.subject.trim() !== '' && 
           feedbackFormState.emails.trim() !== '' && 
           feedbackFormState.workshopTitle.trim() !== '' && 
           feedbackFormState.attendedFeedbackLink.trim() !== '' && 
           feedbackFormState.notAttendedFeedbackLink.trim() !== '';
  }, [feedbackFormState]);

  const generateTemplatePreview = (email: string) => {
    const template = templateFormState.judgeRound === 'final' 
      ? JUDGE_CREDENTIALS_FINAL_TEMPLATE 
      : JUDGE_CREDENTIALS_TEMPLATE;
    return template.replace(/\[email\]/g, email);
  };

  const generateFeedbackPreview = () => {
    return FEEDBACK_FORM_TEMPLATE
      .replace(/\[Workshop Title\]/g, feedbackFormState.workshopTitle || "Example Workshop Title")
      .replace(/\[Link to Attended Feedback Form for This Workshop\]/g, feedbackFormState.attendedFeedbackLink || "#attended-link")
      .replace(/\[Link to Did Not Attend Feedback Form for This Workshop\]/g, feedbackFormState.notAttendedFeedbackLink || "#not-attended-link");
  };

  const handleSendTemplateEmail = async () => {
    if (!idToken || !isTemplateFormValid) {
      toast({ title: "Error", description: "Please fill out all required fields.", variant: "destructive" });
      return;
    }

    const emailList = templateFormState.emails.split(',').map(email => email.trim()).filter(email => email !== '');
    if (emailList.length === 0) {
      toast({ title: "Error", description: "Please provide at least one valid email address.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const emailPromises = emailList.map(async (email) => {
        const personalizedBody = generateTemplatePreview(email);
        const sanitizedHtmlBody = DOMPurify.sanitize(personalizedBody);
        
        return axios.post(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/broadcast-email`, {
          subject: templateFormState.subject,
          body: sanitizedHtmlBody,
          recipient_type: 'individual',
          individual_emails: [email],
        }, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        });
      });

      await Promise.all(emailPromises);
      
      toast({ 
        title: "Success", 
        description: `Judge credential emails sent successfully to ${emailList.length} recipient(s).`, 
        variant: "default" 
      });
      
      setTemplateFormState({
        emails: '',
        subject: 'AWS Hackathon - Judge Credentials',
        judgeRound: 'preliminary',
      });
    } catch (err) {
      console.error("Error sending template email:", err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || err.message || "Failed to send email. Check your network or API configuration.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        const errorMessage = "An unexpected error occurred.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendFeedbackEmail = async () => {
    if (!idToken || !isFeedbackFormValid) {
      toast({ title: "Error", description: "Please fill out all required fields.", variant: "destructive" });
      return;
    }

    const emailList = feedbackFormState.emails.split(',').map(email => email.trim()).filter(email => email !== '');
    if (emailList.length === 0) {
      toast({ title: "Error", description: "Please provide at least one valid email address.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const personalizedBody = generateFeedbackPreview();
      const sanitizedHtmlBody = DOMPurify.sanitize(personalizedBody);
      const personalizedSubject = feedbackFormState.subject.replace(/\[Workshop Title\]/g, feedbackFormState.workshopTitle || "Workshop");
      
      await axios.post(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/broadcast-email`, {
        subject: personalizedSubject,
        body: sanitizedHtmlBody,
        recipient_type: 'individual',
        individual_emails: emailList,
      }, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      toast({ 
        title: "Success", 
        description: `Feedback form emails sent successfully to ${emailList.length} recipient(s).`, 
        variant: "default" 
      });
      
      setFeedbackFormState({
        emails: '',
        subject: 'Feedback: [Workshop Title] – AWS Hackathon',
        workshopTitle: '',
        attendedFeedbackLink: '',
        notAttendedFeedbackLink: '',
      });
    } catch (err) {
      console.error("Error sending feedback email:", err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || err.message || "Failed to send email. Check your network or API configuration.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        const errorMessage = "An unexpected error occurred.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!idToken || !isFormValid) {
      toast({ title: "Error", description: "Please fill out all required fields.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    let payload: {
      subject: string;
      body: string;
      recipient_type: string;
      individual_emails?: string[];
    };
    
    const sanitizedHtmlBody = DOMPurify.sanitize(formState.htmlBody);
    
    if (formState.recipientType === 'individual') {
      const emailList = formState.individualEmails.split(',').map(email => email.trim()).filter(email => email !== '');
      if (emailList.length === 0) {
        toast({ title: "Error", description: "Individual emails field cannot be empty.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      payload = {
        subject: formState.subject,
        body: sanitizedHtmlBody,
        recipient_type: 'individual',
        individual_emails: emailList,
      };
    } else {
      payload = {
        subject: formState.subject,
        body: sanitizedHtmlBody,
        recipient_type: formState.recipientType,
      };
    }
    
    try {
      const response = await axios.post(`${API_GATEWAY_BASE_URL}/hackathons/${currentHackathonId}/admin/broadcast-email`, payload, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
      toast({ title: "Success", description: response.data.message, variant: "default" });
      setFormState({
        subject: '',
        htmlBody: '',
        recipientType: 'individual',
        individualEmails: '',
      });
    } catch (err) {
      console.error("Error sending email:", err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || err.message || "Failed to send email. Check your network or API configuration.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } else {
        const errorMessage = "An unexpected error occurred.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentHackathonId) {
    return <NoHackathonSelected />;
  }

  return (
    <div className="aws-container py-8">
  <h1 className="text-3xl font-bold mb-6">Email Sender</h1>
      
  <div className="mb-6">
        <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={activeTab === 'custom' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('custom')}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Custom Email
          </Button>
          <Button
            variant={activeTab === 'template' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('template')}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Judge Credentials
          </Button>
          <Button
            variant={activeTab === 'feedback' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('feedback')}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Workshop Feedback
          </Button>
        </div>
      </div>
      
  {activeTab === 'custom' && (
        <Card>
          <CardHeader>
            <CardTitle>Send Custom Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="recipient-type">Recipient Type</Label>
                <select
                  id="recipient-type"
                  value={formState.recipientType}
                  onChange={(e) => setFormState({ ...formState, recipientType: e.target.value })}
                  className="p-2 border rounded-md"
                >
                  <option value="individual">Individual Emails</option>
                  <option value="all">All Participants</option>
                </select>
              </div>
              {formState.recipientType === 'individual' && (
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="individual-emails">Individual Emails (comma-separated)</Label>
                  <Input
                    id="individual-emails"
                    value={formState.individualEmails}
                    onChange={(e) => setFormState({ ...formState, individualEmails: e.target.value })}
                    placeholder="email1@example.com, email2@example.com"
                  />
                </div>
              )}
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formState.subject}
                  onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="body">Email Body</Label>
                <Textarea
                  id="htmlBody"
                  value={formState.htmlBody}
                  onChange={(e) => setFormState({ ...formState, htmlBody: e.target.value })}
                  className="min-h-[200px]"
                />
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleSendEmail}
                  disabled={isSubmitting || !isFormValid}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {isSubmitting ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
  {activeTab === 'template' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Send Judge Credentials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="judge-round">Judging Round</Label>
                  <select
                    id="judge-round"
                    value={templateFormState.judgeRound}
                    onChange={(e) => setTemplateFormState({ ...templateFormState, judgeRound: e.target.value as 'preliminary' | 'final' })}
                    className="p-2 border rounded-md"
                  >
                    <option value="preliminary">Preliminary Round Judges</option>
                    <option value="final">Final Round Judges</option>
                  </select>
                  <p className="text-sm text-muted-foreground">
                    Choose which round these judge credentials are for.
                  </p>
                </div>
                
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="template-subject">Subject</Label>
                  <Input
                    id="template-subject"
                    value={templateFormState.subject}
                    onChange={(e) => setTemplateFormState({ ...templateFormState, subject: e.target.value })}
                    placeholder="AWS Hackathon - Judge Credentials"
                  />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="template-emails">Judge Emails (comma-separated)</Label>
                  <Textarea
                    id="template-emails"
                    value={templateFormState.emails}
                    onChange={(e) => setTemplateFormState({ ...templateFormState, emails: e.target.value })}
                    placeholder="judge1@example.com, judge2@example.com, judge3@example.com"
                    className="min-h-[100px]"
                  />
                  <p className="text-sm text-muted-foreground">
                    Each email will be personalized with the recipient's email address in the credentials section for the {templateFormState.judgeRound} round.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowTemplatePreview(!showTemplatePreview)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {showTemplatePreview ? 'Hide Preview' : 'Show Preview'}
                  </Button>
                  <Button
                    onClick={handleSendTemplateEmail}
                    disabled={isSubmitting || !isTemplateFormValid}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                    {isSubmitting ? 'Sending...' : 'Send Judge Credentials'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {showTemplatePreview && (
            <Card>
              <CardHeader>
                <CardTitle>Email Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-4 bg-gray-50 max-h-96 overflow-y-auto">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: generateTemplatePreview("example@judge.com") 
                    }} 
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Preview shows how the {templateFormState.judgeRound} round email will look with "example@judge.com" as the recipient. The actual recipient's email will replace [email] in the credentials section.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
  {activeTab === 'feedback' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Send Workshop Feedback Forms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="feedback-subject">Subject</Label>
                  <Input
                    id="feedback-subject"
                    value={feedbackFormState.subject}
                    onChange={(e) => setFeedbackFormState({ ...feedbackFormState, subject: e.target.value })}
                    placeholder="Feedback: [Workshop Title] – AWS Hackathon"
                  />
                </div>
                
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="workshop-title">Workshop Title</Label>
                  <Input
                    id="workshop-title"
                    value={feedbackFormState.workshopTitle}
                    onChange={(e) => setFeedbackFormState({ ...feedbackFormState, workshopTitle: e.target.value })}
                    placeholder="e.g., Introduction to Machine Learning"
                  />
                  <p className="text-sm text-muted-foreground">
                    This will replace [Workshop Title] in the email template.
                  </p>
                </div>
                
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="attended-link">Attended Feedback Form Link</Label>
                  <Input
                    id="attended-link"
                    value={feedbackFormState.attendedFeedbackLink}
                    onChange={(e) => setFeedbackFormState({ ...feedbackFormState, attendedFeedbackLink: e.target.value })}
                    placeholder="https://forms.google.com/attended-feedback"
                  />
                  <p className="text-sm text-muted-foreground">
                    Link for participants who attended the workshop.
                  </p>
                </div>
                
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="not-attended-link">Did Not Attend Feedback Form Link</Label>
                  <Input
                    id="not-attended-link"
                    value={feedbackFormState.notAttendedFeedbackLink}
                    onChange={(e) => setFeedbackFormState({ ...feedbackFormState, notAttendedFeedbackLink: e.target.value })}
                    placeholder="https://forms.google.com/not-attended-feedback"
                  />
                  <p className="text-sm text-muted-foreground">
                    Link for participants who registered but did not attend.
                  </p>
                </div>
                
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="feedback-emails">Participant Emails (comma-separated)</Label>
                  <Textarea
                    id="feedback-emails"
                    value={feedbackFormState.emails}
                    onChange={(e) => setFeedbackFormState({ ...feedbackFormState, emails: e.target.value })}
                    placeholder="participant1@example.com, participant2@example.com, participant3@example.com"
                    className="min-h-[100px]"
                  />
                  <p className="text-sm text-muted-foreground">
                    All participants will receive the same feedback form with the workshop details you specified above.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowFeedbackPreview(!showFeedbackPreview)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {showFeedbackPreview ? 'Hide Preview' : 'Show Preview'}
                  </Button>
                  <Button
                    onClick={handleSendFeedbackEmail}
                    disabled={isSubmitting || !isFeedbackFormValid}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                    {isSubmitting ? 'Sending...' : 'Send Feedback Forms'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {showFeedbackPreview && (
            <Card>
              <CardHeader>
                <CardTitle>Feedback Email Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-4 bg-gray-50 max-h-96 overflow-y-auto">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: generateFeedbackPreview() 
                    }} 
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Preview shows how the feedback email will appear to participants with your specified workshop title and feedback form links.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default BroadcastEmailPage;