import { MeetingType, HostAccount, M365CalendarState } from '../types';

export const INITIAL_HOST_ACCOUNTS: HostAccount[] = [
  {
    id: 'acc-1',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@zoompartner.com',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    role: 'Principal Solutions Architect',
    department: 'Enterprise Architecture',
    status: 'available',
    currentActivity: 'Active in Microsoft 365 & Zoom',
    m365Connected: true,
    zoomPmi: '849 3019 4820',
    zoomAccountType: 'Enterprise',
    timezone: 'America/New_York'
  },
  {
    id: 'acc-2',
    name: 'Alex Rivera',
    email: 'alex.rivera@zoompartner.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    role: 'Lead Integration Engineer',
    department: 'Platform Engineering',
    status: 'available',
    currentActivity: 'Screen-Share Ready (Zoom Dev Suite)',
    m365Connected: true,
    zoomPmi: '938 4120 5912',
    zoomAccountType: 'Enterprise',
    timezone: 'America/Los_Angeles'
  },
  {
    id: 'acc-3',
    name: 'David Kim',
    email: 'david.kim@zoompartner.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    role: 'Director of Cloud Architecture',
    department: 'Executive Engineering',
    status: 'available',
    currentActivity: 'Exchange Synced',
    m365Connected: true,
    zoomPmi: '712 9054 3821',
    zoomAccountType: 'Enterprise',
    timezone: 'America/Chicago'
  },
  {
    id: 'acc-4',
    name: 'Maya Patel',
    email: 'maya.patel@zoompartner.com',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    role: 'Senior Customer Success Lead',
    department: 'Client Solutions & Growth',
    status: 'available',
    currentActivity: 'Available for Zoom Video Onboarding',
    m365Connected: true,
    zoomPmi: '620 3918 4729',
    zoomAccountType: 'Licensed',
    timezone: 'Europe/London'
  }
];

export const INITIAL_MEETING_TYPES: MeetingType[] = [
  {
    id: 'mt-30',
    title: '30 Minutes',
    slug: '30-min-zoom',
    duration: 30,
    description: 'Standard 30-minute Zoom video meeting session. Fast, focused strategy consultation with live screen-sharing.',
    color: '#0E71EB',
    hostName: 'Sarah Jenkins',
    hostEmail: 'sarah.jenkins@zoompartner.com',
    hostAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    hostRole: 'Principal Solutions Architect',
    hostAccountId: 'acc-1',
    zoomMeetingType: 'video',
    requiresApproval: false,
    isActive: true,
    bufferMinutes: 10,
    customQuestions: [
      {
        id: 'q1',
        label: 'What is the primary topic or goal for this Zoom meeting?',
        type: 'textarea',
        placeholder: 'Please describe what you would like to achieve or specific questions you have...',
        required: true,
        helpText: 'Helps us prepare relevant technical documentation in advance.'
      },
      {
        id: 'q2',
        label: 'Company or Organization Name',
        type: 'text',
        placeholder: 'Acme Corp / Startup Studio',
        required: false,
      },
      {
        id: 'q3',
        label: 'Do you require Screen Sharing / Live Demo capabilities?',
        type: 'radio',
        required: true,
        options: ['Yes, I want to share my screen/demo', 'No, audio & webcam discussion is sufficient', 'Not sure yet'],
      },
      {
        id: 'q4',
        label: 'Zoom Audio Preference',
        type: 'select',
        required: false,
        options: ['Computer Audio (VoIP)', 'Telephone Dial-In', 'Both / Either'],
      }
    ]
  },
  {
    id: 'mt-45',
    title: '45 Minutes',
    slug: '45-min-zoom',
    duration: 45,
    description: 'Extended 45-minute technical breakdown, architecture review, and live product demonstration.',
    color: '#2D8CFF',
    hostName: 'Alex Rivera',
    hostEmail: 'alex.rivera@zoompartner.com',
    hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    hostRole: 'Lead Integration Engineer',
    hostAccountId: 'acc-2',
    zoomMeetingType: 'screenshare',
    requiresApproval: false,
    isActive: true,
    bufferMinutes: 15,
    customQuestions: [
      {
        id: 'q1',
        label: 'Current Tech Stack & Systems to Integrate',
        type: 'textarea',
        placeholder: 'e.g., Microsoft 365, Azure, React, Node.js, Custom CRM...',
        required: true,
      },
      {
        id: 'q2',
        label: 'Expected number of attendees from your team',
        type: 'select',
        required: true,
        options: ['Just me (1 person)', '2 - 4 team members', '5 - 10 people', '10+ stakeholder demo'],
      }
    ]
  },
  {
    id: 'mt-60',
    title: '1 Hour',
    slug: '1-hour-zoom',
    duration: 60,
    description: 'Comprehensive 1-hour in-depth consultation, system architecture review, and hands-on workshop session.',
    color: '#0B5CBE',
    hostName: 'David Kim',
    hostEmail: 'david.kim@zoompartner.com',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    hostRole: 'Director of Cloud Architecture',
    hostAccountId: 'acc-3',
    zoomMeetingType: 'video',
    requiresApproval: false,
    isActive: true,
    bufferMinutes: 15,
    customQuestions: [
      {
        id: 'q1',
        label: 'Primary meeting objectives and agenda items',
        type: 'textarea',
        placeholder: 'Outline the main topics to cover during this 1-hour workshop...',
        required: true,
      },
      {
        id: 'q2',
        label: 'Do you require automated Zoom Cloud Recording with transcription?',
        type: 'radio',
        required: true,
        options: ['Yes, send recording & transcript after meeting', 'No recording needed'],
      }
    ]
  },
  {
    id: 'mt-custom',
    title: 'More than 1 hour',
    slug: 'custom-zoom',
    duration: 90,
    description: 'Custom duration session for extended team workshops, training, executive reviews, or multi-topic meetings.',
    color: '#6366F1',
    hostName: 'Maya Patel',
    hostEmail: 'maya.patel@zoompartner.com',
    hostAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    hostRole: 'Senior Customer Success Lead',
    hostAccountId: 'acc-4',
    zoomMeetingType: 'video',
    requiresApproval: false,
    isActive: true,
    bufferMinutes: 20,
    customQuestions: [
      {
        id: 'q1',
        label: 'Extended Meeting Agenda & Objectives',
        type: 'textarea',
        placeholder: 'Describe the key goals and discussion topics for this extended session...',
        required: true,
      },
      {
        id: 'q2',
        label: 'Estimated Participant Count',
        type: 'select',
        required: true,
        options: ['1 - 5 attendees', '6 - 15 attendees', '16 - 50 attendees', '50+ attendees (Large Zoom Room)'],
      }
    ]
  }
];

export const INITIAL_M365_STATE: M365CalendarState = {
  connected: true,
  accountEmail: 'sarah.jenkins@zoompartner.com',
  displayName: 'Sarah Jenkins (M365 Exchange)',
  calendarName: 'Primary Calendar (Outlook 365)',
  syncEnabled: true,
  sendEmailViaGraph: true,
  lastSyncTime: new Date().toISOString(),
  conflictEventsCount: 5,
};
