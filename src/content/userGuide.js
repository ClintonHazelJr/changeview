export const USER_GUIDE_MD = `# The ChangeView Guide

Everything you need to know to run a change program in ChangeView, from first setup to your first report.

## 1. Set up your workspace

Before you can track any change, ChangeView needs to know your organization's structure. This is a one-time setup, done in **System Admin**.

**Add your Org(s)** — a client company or your own organization. You can have several under one Workspace if you're a consultant running multiple engagements.

**Add Departments** — the teams within that Org (Operations, Finance, IT, and so on). Every Impact and every Person gets tied to a Department, so this matters, even a rough structure is better than none.

**Add People** — your directory. Add someone once here, then reuse them everywhere: Stakeholders, Change Owners, Task Assignees, Requirement Authors. You never re-type a name twice.

**Add Project Teams** — group People together so you can assign a whole team to an Initiative in one go, rather than adding people one at a time on every project.

## 2. Structure: Program → Initiative

A **Program** is the container for related change work, a major transformation, a department-wide rollout, anything with more than one moving piece under it. Give it a budget, a sponsor, a program manager, and goals.

An **Initiative** sits under a Program, it's the actual unit of change you're running: a system migration, a process change, a reorg. Every Initiative belongs to exactly one Program.

If you're only running one thing at a time, don't overthink the Program layer, create one and put your Initiatives under it. The structure is there for when you're managing several things at once, not required overhead for a single project.

## 3. Scope the Impact

This is the heart of ChangeView. For every Department your Initiative touches, add an **Impact** record:

- **Current state → Future state**, for both the system and the process. Be specific. "You will be trained on the new system" tells nobody anything. "You'll stop using the shared spreadsheet and log requests directly in the portal" does.
- **Severity**, rated separately across five categories: Organization, People, Process, System, Environment. Don't rate everything "high", an honest rating is what makes your plan actually prioritized. Use "No Impact" where it genuinely applies.
- **Intervention tags** — Training, Huddle, Email, Documentation, whatever's actually needed for that specific Impact.
- **Attach documents** directly to the Current State or Future State fields, process maps, screenshots, whatever helps someone understand exactly what's changing.

## 4. Add Stakeholders and Learning Needs

**Stakeholders** are the specific people involved in this Initiative, pulled from your People directory. Set their RACI role (Responsible, Accountable, Consulted, Informed), a person can hold more than one.

**Learning Needs** live under a specific Impact, they're the actual training plan: which team, what goal, how many people, what type of session, how long. Attach training materials directly here.

## 5. Draft Comms with AI

The Comms tab is where you draft communications, and it's the one place ChangeView does real work for you. Fill in the key message, pick your audience, tone, and channel, then hit **AI Comms Generator**. It pulls in the actual Impact context (current state, future state, severity) so the draft isn't generic, it's specific to what's actually changing for that audience.

Every draft is editable before you save it. Comms in ChangeView are copy-paste, not auto-send, you stay in control of what actually goes out and where.

## 6. Track Tasks and Hypercare

**Tasks** are the execution layer, who's doing what, by when. Use the Kanban board (Backlog → Ready → In Progress → Blocked → Done) to track real progress, or the List view to scan everything at once. Link Tasks to Requirements where relevant.

**Hypercare** is the post-launch support window, add your pilot details, success criteria, and the actual dates you'll be watching closely after go-live.

## 7. See the whole picture: Schedule and Reports

**Schedule** shows everything on one timeline, Programs, Initiatives, Tasks, and Hypercare, grouped and indented so you can see the real hierarchy, with Go Live and Comms delivery dates marked as milestones. Click anything to jump straight to that record.

**Reports** turns your data into something you can actually hand to a stakeholder or a client:

- **Requirements list** — every requirement across an Initiative, filterable by status
- **Change Impact Assessment** — a full, readable writeup of an Initiative's impact, or the same rolled up across an entire Program
- **Heat map** — at a glance, which departments are carrying the most severe impact, across all five categories
- Every report exports to PDF, ready to share.

## A few things worth knowing

- **Archiving** a Program or Initiative hides it from your default view without deleting anything, fully reversible. **Deleting** is permanent and takes everything under it with it, ChangeView asks you to confirm twice before letting that happen.
- **Deactivating** a Person or Department removes them from future assignment pickers without touching anything they're already tied to historically.
- If you're on **Starter**, Schedule, Tasks, and several reports aren't included — Requirements list, Change Impact Assessment, and Schedule Report stay free. Upgrade any time from Profile → Upgrade Plan.

That's the whole loop: scope the impact, plan the comms and training, track it through launch, report on it afterward. Start wherever your current project actually is, you don't need to run the whole sequence from day one to get value out of any single part of it.
`;
