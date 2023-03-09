# PAOLA utils
## Precourse Automated Operations and Logistics Assistant

A series of tools and reusable library code used in automating the operations of SEI Precourse.

This repository has two broad components:
- reusable library code for interacting with services
- tools for specific actions, most of which run via GitHub Actions

## Tools

All existing tools are Node.js scripts which live in the `tools/` directory. For details on secret management, see the Secret Management section below. Included below are brief descriptions of each of the currently-available tools.

### Automated Repo Completion

The repo completion tool clones student repositories and tests them to ensure completion, by using a headless browser to run the test suite and match passing test counts. This tool is located in `tools/completion` with an entry point of `cli.js` which accepts numerous arguments to run on particular students, pods, and assignments.

Different assignments each have a separate project file defining how the grading works, with Twiddler being the outlier as its tests aren't running in a headless browser but rather via Cypress directly.

A cache is present in the Pulse Google Sheet with git commit hashes of the most recently tested commit for each student, so the same code doesn't get re-tested on each invocation. This cache can be cleared just by clearing that worksheet.

There is a workflow which runs this tool four times per day.

### Emails

Email automation will programmatically generate lists of students who should receive a given email and generate mail merge fields to parameterize each email. The different emails that can be sent, with their own logic to decide who should receive the email, is in `tools/emails/emailDefinitions.js`.

There is a `cli.js` entry point to run this tool with various options, including test runs to both list the recipients who would receive an email without sending it, and to send a single test email to a specific address to ensure that the mail merge parameters are correct.

Email templates are defined in the paola@galvanize.com Gmail Drafts folder. Drafts are selected by name, parameterized, and sent to the appropriate recipients.

A cache is present in the Pulse Google Sheet with a mapping of email names to email addresses who have already received that email, so the same student doesn't receive the same reminders multiple times. This cache can be cleared just by clearing that worksheet.

There is a workflow to run this tool via GitHub Actions but it does not run automatically on a schedule.

### New Student Onboarding

Onboarding is a multi-step process which pulls new students from Salesforce, compares their Contact IDs to what is present in the roster, and onboards any students who have signed their enrollment agreements and are not yet in the roster. This process includes:

- Adding the student to the Learn cohort
- Adding the student to the GitHub student group
- Adding the student to the roster and Repo Completion (per-pod) sheets (including pod assignment to TMs)
- Creating a student's private Slack channel
- Sending the student a welcome email, including their deadline dates

There is a workflow which runs this tool every two hours.

### Other Tools

#### initializeSEICohorts

This is an end-of-cohort script to initialize the cohorts for the coming round of SEI for each campus, as well as for the next round of Precourse. All of the configuration for what everything should be named, as well as staff members who should be added to the GitHub teams and Learn cohorts, are located in the script near the top. This tool runs in three phases, toggled on or off by booleans at the top of the file: creating the groups on Learn and GitHub; adding staff to them; and adding students to them.

No action is needed to run this script all at once, but if you run the first step separately from the other two, then you'll need to update the mapping of Learn cohort names to cohort IDs, which gets printed out when the first step runs. 

#### inviteToGitHub

This is a one-off script to invite a single user by GitHub username onto the current student GitHub team. There is a workflow to run this tool when it is needed.

#### resendGitHubInvites

This script will check for students whose GitHub invite has expired, by comparing student GitHub usernames from the roster and the current members of the team. This is necessary as GitHub invites expire after 7 days, and students will often not accept their invites in time. This tool runs via a workflow a few times per day.

#### updateCESP

This tool regenerates the Currently Enrolled Students & Progress sheet based on the Pulse sheet and the Repo Completion worksheets. This tool runs via a workflow a few times per day.

#### updateRosterFromSFDC

This tool pulls all students from Salesforce and updates the Precourse roster with any fields that differ between SFDC and the roster. This tool runs via a workflow a few times per day.

## Secret Management

Secrets are provided via _environment variables_, and some secrets are required for basically every tool.

When running the scripts via GitHub Actions, which most are equipped for, these secrets are provided by the workflow definitions as defined in this repository. The secret names need to be present in the workflow YAMLs as well as in the secrets configuration on GitHub itself.

When running the scripts locally, you'll need a file named `.env` in the root of your repo containing references to these secrets. You can acquire these secrets from another developer with access to the project.
