# Phase 3: Organization Onboarding UI Reference

Design files: `/Users/ardiansyahiqbal/Downloads/onboading-klayim/`

## Pages Overview

### 1. Connect HRIS (`05_connect_hris.png`)
- **Sub-stepper**: Connect HRIS → Connect Calendars & Task → Configure Governance
- **Back button**: Arrow left (top-left)
- **Provider cards** (3 columns):
  - BambooHR - "Sync employee data and hourly rates using BambooHR"
  - Rippling - "Sync employee data and hourly rates using Rippling"
  - Gusto - "Sync employee data and hourly rates using Gusto"
- **Fallback section**: "Don't see your HRIS?"
  - Upload CSV button
  - Contact Support button
- **Info accordion**: "What we'll import" (collapsible)
  - Employee names and emails
  - Roles and departments
  - Hourly rates (calculated from salaries)
  - Employment status (active, contractor)
- **Actions**: Skip for Now | Next

### 2. Connect Calendars (`06_connect_calendar.png`)
- **Sub-stepper**: Connect HRIS ✓ → Connect Calendars & Task (active) → Configure Governance
- **Provider cards** (2 columns):
  - Google Workspace - "Sync calendars and check team availability in real time"
  - Microsoft 365 - "Sync calendars and check team availability in real time"
- **Info accordions**:
  - "What we'll track":
    - Employee names and emails
    - Roles and departments
    - Hourly rates (calculated from salaries)
    - Employment status (active, contractor)
  - "What we don't track":
    - Meeting recordings or transcripts
    - Meeting content or discussions
    - Individual messages or chat
- **Actions**: Skip for Now | Next

### 3. Connect Task Management (`07_connect_task.png`)
- **Sub-stepper**: Connect HRIS ✓ → Connect Calendars & Task (active) → Configure Governance
- **Provider cards** (3 columns):
  - Asana - "Sync tasks and projects to keep meetings aligned with work"
  - ClickUp - "Sync tasks and projects to keep meetings aligned with work"
  - Linear - "Sync tasks and projects to keep meetings aligned with work"
- **Info accordion**: "What we'll import"
  - Task creation and completion dates
  - Task updates and reassignments
  - Time to completion by task type
  - Tasks assigned to external contractors
- **Actions**: Skip for Now | Next

### 4. Configure Governance (`08_configure_goverance.png`)
- **Sub-stepper**: Connect HRIS ✓ → Connect Calendars & Task ✓ → Configure Governance (active)
- **Form fields**:
  - Meeting Cost Threshold: `$ [500]` - "Meetings exceeding this cost will require manager approval"
  - Low ROI Threshold: `[1.0] x` - "Meetings with ROI below this will be flagged for review"
  - Approval Email: `[Enter approval email here...]` - "Who should receive approval requests?"
  - Dashboard Refresh: Dropdown `[30 minutes]` - "Auto-refresh every"
  - Checkbox: "Enable pull-to-refresh"
- **Actions**: Complete Setup (with checkmark icon)

### 5. Onboarding Success (`onboarding_success.png`)
- **Main stepper**: All steps completed (green checkmarks)
- **Header**: "Welcome to Klayim, {userName}!" + "Let's get you set up in 3 quick steps"
- **Card**: "What happens next"
  - Your dashboard will populate with data within 24 hours
  - Meeting costs are calculated automatically
  - High-cost meetings will route to you for approval
  - You'll receive weekly governance summaries
- **Action**: Go to Dashboard

### 6. Upload CSV (`Upload CSV.png`)
- **Sub-stepper**: Upload → Validate → Confirm
- **Drag & drop zone**: "Drag and drop your CSV here" or "browse files"
- **File info**: "Supported: .csv · Max 5MB"
- **Required Columns** (collapsible):
  - Full Name
  - Email (company domain)
  - Hourly Rate or Annual Salary
  - Department
  - Role
- **Download Template** button
- **Action**: Skip for Now

## Common UI Patterns

### Sub-stepper (Organization Onboarding)
- 3 steps: Connect HRIS → Connect Calendars & Task → Configure Governance
- States: pending (gray dot), active (gray dot + bold text), completed (green checkmark)

### Provider Cards
- Icon (top-left)
- Provider name (title)
- Description text
- "Connect" button (dark)

### Info Accordions
- Question mark icon + title
- Expandable/collapsible
- Checklist items with green checkmarks (positive) or red X (negative)

### Navigation
- Back button: Arrow left icon (top-left)
- Actions: "Skip for Now" (outline) | "Next" or "Complete Setup" (filled dark)
