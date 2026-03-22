Quickstart

Copy page

Welcome to Loops, the platform for SaaS email.

This is your guide to getting started with Loops. If you’re new to setting up email for your SaaS company, this is the guide you should start with.
​
What is Loops?
Loops is an email platform, that helps you send marketing and transactional emails from our app, API and integrations.
With Loops, you can track events and contact properties and then use that information to send emails to increase revenue, engagement or just generally improve your user’s experience of your app.
Let’s get started ✨
What we’ll be covering…
Set up your domain records
Import contacts
Collect signups with a form
Create your first email
Send transactional email
​
1. Set up your domain records
The first step is to set up your domain, so you can send emails through Loops. You need to do this before you can send any emails.
We send from your domain so your emails appear as if they are coming from you.

We choose to send from a mail.loops.so subdomain but you can send from your root domain if you’d prefer.
To set up your domain in Loops, you need to add some MX, TXT and CNAME records to your domain’s DNS settings so that we can verify that you own the domain you want to send emails from.
Once you’ve set up your domain records, you’ll be able to start sending emails!
You can always send the records to a developer to help you integrate them. Read how to add a member to your team.
Setting up your domain
Subdomains vs root domains
​
2. Import contacts
To send marketing and product emails to your contacts, you will need to import those contacts into Loops.
Note: this isn’t required if you only plan to use transactional email, as those contacts can be emailed directly via the API.
If you have any existing contacts, i.e from a waitlist, your early access users, a database or your audience on a different platform, you can get started by importing them via CSV.
You can import contacts via CSV upload, API or through one of our integrations.
The most popular path is to import a CSV of existing contacts, then going forward automatically add contacts using our API, a form or an integration.
​
Contacts
Contacts are unique users in your Loop’s audience. We use email and a unique identifier to distinguish contacts. The only required field a contact must have is an email.

​
Contact properties
Contact properties are additional pieces of information you can associate with a contact. They can include things like name, location, job title, and more.
We provide default properties like name, user group and source, but you are free to add any number of custom properties to your contacts, too.

You can use contact properties to segment your audience and send more targeted emails to specific groups.
For example, you could send a promotional email only to contacts with a certain job title or to those in a specific user group.
Add with CSV Upload
Add via integrations
Add with the API
Filters and Segments
​
3. Collect signups with a form
Adding a form to your site is one (popular) way to automatically add new contacts to your Audience.
Even if you’re adding contacts programmatically via API or integration, in most cases you’ll also want to have an input form on your page to collect emails for newsletters or product updates.
To add a form to your site, head over to the Forms page.
You will see a handful of customization options including the form style, placeholder text, success message, font, font color, button color, and more.
Make as many changes as you need to create a form that matches your brand.
Simple form
When you have finished customizing your form, simply copy the HTML or JSX that is automatically generated and paste it into your site.
For more flexibility, you can create custom HTML forms that work with Loops. Read our full guide about custom forms or check out our form-based integrations.
Simple form
Custom form
Add a form to Framer
Add a form to Webflow
​
4. Create your first email
To create your first email, first select the type of content you’ll be sending. You can send email as a campaign, loop or transactional email. You can also choose to start with a Template instead of starting from scratch.

Campaigns are single marketing emails sent to a group (e.g. newsletters, product updates, announcements, investor updates), Loops are automated emails sent based on specific triggers or conditions (e.g. onboarding sequences) and Transactional emails are one-off emails sent to a single person (e.g. forgot password, two-factor authorization codes, receipts). Read more
In this example, we will build a product update (a campaign), which could be sent to your users if you’re building a SaaS. They should be sent monthly or at a faster cadence depending on shipping speed and contain a high-level overview of what you shipped over the last 30 days.
To get started, click the Create button on the Home screen, followed by Campaign.
Then we’re going to personalize by adding dynamic content and style it to match our brand.
Adding personalizationAdding styling
You can preview your email any time by hitting the paper airplane icon in the top right of the editor window.
Once you’re finished with the email content, click Next in the top right to choose your audience.
Now we’ll select the audience segment to whom we’ll be sending the update.
Since we’re sending a product update, we want to send it to our entire audience so we won’t be adding any audience filters.
If you’d like to segment your audience, just click Add filter, which will open the filtering options.
Filter campaign audience
Click the Next button top right and you’ll see options to send the email immediately or to schedule it for a time in the future.
Schedule a campaign
Click Next one last time to see a review of your email and settings (you can also see a preview of your email, too). If you’re happy with how everything looks, click Schedule send on the last page and we’re done!
The email is now scheduled to go out.
By the way, you can cancel the scheduled send at any time between the send time and now to update it, or you can just send it right away.
Types of emails
Sending your first email
Editing emails in our editor
Custom emails with Emailify, Email Love or MJML
​
6. Set up an automated mail sequence
We suggest that new Loops users warm up their new sending domain with a welcome email sequence. A slow ramp up of emails sent to highly-engaged recipients will help prepare your domain for larger campaigns later on (read more).
You can create an onboarding or welcome sequence using what we call “loops”.
A loop looks like this:

Go to the Loops page and click New.
We’ll start with the “Introduce yourself” template. This will create a loop with a “Contact added” trigger (meaning every new contact will be added to the loop), with an already-written introduction email ready for you.
Edit the email and when you’re ready to make it live, click Start.
You can use branches to create more complex workflows, sending contacts down different branches depending on contact properties or even whether they’ve interacted with campaigns you’ve sent from Loops.
Branches in a loop
Loop builder
Triggering Loops
Branching Loops
​
7. Send transactional email
You’ll likely need to send a password reset, login or other automatic email that confirms a user action.
These non-promotional emails are considered Transactional emails and are the 1:1 emails that are sent to a single contact via API or integration.
They’re included in all paid Loops plans, and also included within the 4,000 monthly sends available in the Free plan.
To get started, click the Create button on the Home screen, followed by Transactional.
Next, it’s time to write and style your email.
We recommend following a similar style across all of your Transactional emails. You can do this by using themes.
Let’s create a Password Reset email together.
Add copy and styling, and then to add dynamic content click the Insert data variables icon and specify a data variable name.
These data variables will be populated with real content when you send the email using the API.
Add data variables
Click the Next button top right to view the data needed in your API call.
View the paylod
Hit Publish to finalize the email. Copy the payload details and the ID; you’ll need these to send the email using the API.
Make an API request to the transactional endpoint (or use an SDK).
POST https://app.loops.so/api/v1/transactional
You will need the payload copied from before. Make sure to include values for all of the data variables you added to the email.
{
  "transactionalId": "clfq6dinn000yl70fgwwyp82l",
  "email": "favorite@example.com",
  "dataVariables": {
    "name": "Chris",
    "passwordResetLink": "https://example.com/reset-password"
  }
}

Setting up your domain

Copy page

Steps for adding a sending domain to your account.

When you set up your account for the first time, you need to set up your domain records in order to start sending email. We’ll be sending email on your behalf, so we need to verify that you own the domain you’re sending from.
Here’s how to set it up in just a few steps.
​
Step 1: Add your sending domain
During the sign up flow, you are asked to specify your desired sending domain. You can enter any domain here that you can set up DNS records for, and if you choose a subdomain, it doesn’t need to exist yet.
We recommend using a subdomain for this, e.g. mail.yourcompany.com, rather than sending from your root domain yourcompany.com.
Adding a domain during sign up
If you have already signed up and want to edit your sending domain, you can do so from Settings -> Domain.
You do not need to create this subdomain with an A or CNAME record. Loops will provide all DNS records you need to set up.
​
Step 2: Set up your records
From the Settings -> Domain page, click View records (or click this link to go directly).

On this page, you’ll see a few things.
Your records
These are SPF, DKIM and MX records that need to be set up in your domain zone editor inside of your domain registrar like Namecheap, Google Domains, AWS, Godaddy or elsewhere.
Next to each record is a clipboard icon. You can use this to copy the records to your clipboard and easily paste them into your domain registrar.
Your sending domain
This is indicated below by “yourcompany.com”. This will have your domain listed. If you’d like to change domains, you can do so in the account settings.
A verify records button
Once you have copied your records to your registrar, click this button to verify they have been set up correctly.

​
Step 3: Add your domain records
Copy and paste the records one by one into your registrar.
You want to use the Type (indicated as TXT, CNAME and MX) in setting up your records, not the title of the record e.g. SPF, DKIM, MX.
Loops’ records for SPF are at envelope.sendingdomain.com, meaning they won’t collide with any other SPF records you have set up. We specify a DMARC record so that you have one, but you can also just have a single DMARC at the root domain level.
Cloudflare

Dreamhost

GoDaddy

Google Domains

Namecheap

Route 53

Squarespace

Wix

Make sure you enter the “Priority” while setting up your MX record. In most registrars this is done by formatting it like “10 pastedrecordname”. Occasionally you will be asked to place it on a separate line. Just make sure to read the instructions on the page as you set up your MX record and if you have any questions, just ping help@loops.so
​
Step 4: Verify your records are set up correctly
After you have copied and pasted your records into your domain registrar, click Verify Records at the bottom of the page to check your configuration is correct.
Sometimes records can take up to an hour to propagate across all the servers. During that time you may see different records validate. This is totally normal, just check back later.
If the domain is set up correctly, you should see a page like the one below. If not, check back soon; sometimes records can take some time to propagate.
Notice the “Records present” in green next to each record section.

​
Domain already in use
If you’re getting a “domain already in use” error when trying to set up your domain, this typically means someone on your team has already registered an account with Loops using your domain.
Here are the steps you can take to resolve this:
Signing in with another account

Search your inbox

Check with your team

If you’ve tried all these steps and still can’t access your domain, contact our support team for manual assistance.

Types of emails

Copy page

Learn about the three types of emails that you can send with Loops: Campaigns, Loops, and Transactional.


​
Campaigns
A Campaign is the right type of email for a one-off send to your audience or a segment of your audience.
Marketing emails are a 1-to-many communication, meaning that the same exact email that you craft can (and probably will) be sent and read by a number of recipients or customers.
Examples:
Newsletters
Investor updates
Product updates
User feedback requests
How to send a Campaign:
Hit “Create” in the top right corner of your Loops dashboard.
Select “Campaign” in the popup module.
Enter the subject line, preview text, and content of the email.
Select your audience segment.
Schedule the email to send later or send it immediately.
​
Loops
A Loop is an email that is triggered by an event, a contact being added to your audience, or a contact property update.
Examples:
Welcome emails
User onboarding sequences
User check-ins
For more information on sending your first Loop, visit this guide.
​
Transactional
A Transactional email is an automated message that is triggered by a specific contact action.
Examples:
Password resets
Purchase or upgrade confirmations
Shipping information
Account cancellation emails
For more information on sending your first Transactional messages, read the transactional email guide.
Things to note:
Unlike campaigns and loops, transactional emails are not promotional in nature and as a result, they do not require unsubscribe information to be included in the email.
Unlike campaigns and loops, we do not track opens or link clicks in transactional emails, to increase deliverability of your emails. This also means that email.opened and email.clicked webhook events are not available for transactional emails.
Contacts behave slightly differently between transactional and marketing emails (campaigns and loops):
Your Audience only contains marketing contacts. If a new contact is sent a transactional email, they are not added to your Audience, unless you use the addToAudience flag when sending the email.
Sending a transactional email to a new contact will not trigger the “Contact added” loop trigger.
The “Subscribed” contact property does not affect transactional emails. Unsubscribed contacts will still receive all transactional emails they are sent.

Sending your first email

Copy page

A guide for creating and sending emails with Loops.

So you’re ready to send your first email from Loops!
Let’s go through some best practices and then see how creating an email works.
​
Best practices
Here are some important things to know and bear in mind when sending email with Loops.
We have a “low-html” editor, which means your emails send with a minimal amount of styles applied. We do this so your emails are highly readable and so they’re more likely to not be placed in the spam folder or deprioritized in the inbox by your email provider.
Try not to use sensational copy like “sale”, “discount” or exclamation points in your emails.
It’s also important to keep your emails short and to the point. Use an efficient subject line that encourages the reader to open the email and get to the point quickly in the body of the message.
Use personalization when possible to make the message more engaging and relevant to the reader by personalizing your emails.
​
Send your first email
First, choose which type of email you want to send: a campaign, a loop or a transactional email.
Find out about the types of email you can send from Loops.
To send your first email, simply choose a template or start an email from scratch.

​
Sending settings
Along with the email subject, you can determine some of the sending settings, like the “From” sending address.
By clicking > you will reveal a settings panel, where you can specify the From email address (which is always tied to your sending domain), Reply to email and the Preview text (typically shown in email clients just beneath the Subject). For loops and transactional emails you can also specify a CC and BCC address.
Email sending settings
You can include dynamic variables in these fields, too, making them personalized for each recipient of your campaigns, loops and transactional emails. Just click the contact property, event property or data variable icon next to each field.
Adding dynamic data to the sending settings
Read more about sending settings
​
Add contact data
You may want to add contact data into your emails, for example, a first name or a purchased product’s name. You can do this by adding dynamic content to your email.
Learn more about personalizing emails

​
Make your message visual
When you design an email with Loops, you can add instructive screenshots, GIFs, or images to create an engaging email.
Simply drag and drop any image (including GIFs!) into the editor.
You can also easily add links, lists, buttons and dividers to create more engaging and useful emails.
We also offer a styling panel to customize design elements like font size, text color, background color, borders and spacing.

Read more about our editor
​
Preview your email
Once you are happy with the design of your email, you can preview it in your email client.
Click the Send a preview icon in the top right corner of the email editor to send a test email to yourself or anyone on your team from the “Send a Preview Email” modal.

The Add preview tag toggle will add a “[Preview]” to the start of the subject line to easily identify them in your inbox. Toggle this off to see how the email will appear in your recipients’ inboxes.
​
Dynamic content in previews
When sending preview emails, Loops uses the contact properties and any declared fallbacks of the selected contacts in the preview modal. However, any custom values you enter in the Dynamic content tab will override the contact’s actual properties.
If you have dynamic content in your email, you can add custom content on the Dynamic content tab.

​
Test without sending emails
You can test email sending by using email addresses with @example.com and @test.com domains. This will not actually send emails but is a great way to test loops, schedule campaigns, or test transactional emails without affecting your sending domain’s reputation.
​
Set up your email sending for the first time
Now you’re ready to send the email!
You are able to select which contacts to send to, then either send it now or schedule it for later.

API Introduction

Copy page

The Loops REST API lets you manage your contacts, send events and send transactional email.

​
Authentication
Your Loops API key should never be used client side or exposed to your end users.
Start here if you want to use the Loops API to add contacts to your Loops audience, update their attributes, and send events to Loops.
Authentication Steps

​
Rate Limiting
To ensure the quality of service for all users, our API is rate limited. This means there’s a limit to the number of requests your application can make to our API in a certain time frame. The baseline rate limit is 10 requests per second per team.
Rate Limiting Details

​
Debugging
Sometimes things go wrong. Here are some tips to help you debug your API requests.
Debugging Steps

​
OpenAPI spec
Get started quickly with the Loops API using our OpenAPI documents.
You can import these documents into an API client like Postman or Insomnia to see and use all of our endpoints, with example requests and expected responses.
YAML: app.loops.so/openapi.yaml
JSON: app.loops.so/openapi.json
​
SDKs
SDKs are software packages built on top of the API, making it easier to integrate into your project.
JavaScript
The official JavaScript/TypeScript SDK for Loops.
Nuxt
The official Nuxt module for Loops.
PHP
The official PHP SDK for Loops.
Ruby
The official Ruby SDK for Loops.
​
Unofficial SDKs
The following SDKs are community-submitted and have not been officially reviewed or endorsed by Loops. We recommend thoroughly testing and reviewing the code before integrating it into your project.
Laravel by PlutoLinks
PHP by PlutoLinks
Ruby on Rails by Daniel Friis
Submit an SDK
​
API Reference
The base URL for the API is https://app.loops.so/api
​
Contacts

