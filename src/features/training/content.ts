/**
 * The tour's steps, in both languages. Bump a VERSION when a track's steps
 * change; completions on older versions stay valid (D31), the People page
 * shows which version each person walked.
 *
 * Anchors are `data-tour` attributes on the real controls. A step whose
 * anchor is missing on the page (an empty run list, say) shows as a centred
 * card, so the tour never stalls on content that is not there yet.
 */

import type { TourStep } from "./tour";

export const MANAGEMENT_VERSION = "management.v2";
export const FLOOR_VERSION = "floor.v1";

const ADMIN = ["owner", "ops_manager"] as const;

export const MANAGEMENT_STEPS: readonly TourStep[] = [
  {
    id: "welcome",
    anchor: null,
    route: "/app",
    title: { en: "Welcome to AKIRA Ops", bn: "AKIRA Ops-এ স্বাগতম" },
    body: {
      en: "This is a short walk through the screens you will use. It takes about two minutes. Tap Next to move on; nothing you do here changes any data.",
      bn: "আপনি যে স্ক্রিনগুলো ব্যবহার করবেন, তার একটি ছোট পরিচয়। প্রায় দুই মিনিট লাগবে। এগোতে Next চাপুন; এখানে কিছুতেই কোনো তথ্য বদলাবে না।",
    },
  },
  {
    id: "getting-started",
    anchor: "nav-onboarding",
    // The tour opens the page rather than only pointing at the link: this is
    // the one screen a new owner has to act on, and being shown where it is
    // is not the same as being taken there.
    route: "/app/onboarding",
    title: {
      en: "Start here: what this outlet still needs",
      bn: "এখান থেকে শুরু: এই আউটলেটে আর কী কী দরকার",
    },
    body: {
      en: "Getting started lists what is still missing and the screen that fixes each one. Most of it is four Petpooja exports — Item Wise teaches the menu, Order Listing brings the bills, Category Wise brings the attach rates, and Item Report: Day Wise turns recipes into expected stock usage. Each step ticks itself off once the file is in; there is nothing to mark done by hand.",
      bn: "Getting started-এ দেখা যায় কী কী বাকি আছে আর কোন স্ক্রিনে গিয়ে সেটা করতে হবে। বেশিরভাগই চারটি Petpooja এক্সপোর্ট — Item Wise মেনু শেখায়, Order Listing বিল আনে, Category Wise অ্যাটাচ রেট আনে, আর Item Report: Day Wise রেসিপি থেকে প্রত্যাশিত স্টক খরচ বার করে। ফাইল আপলোড হলেই ধাপটা নিজে থেকে সম্পূর্ণ হয়ে যায়।",
    },
  },
  {
    id: "dashboard-health",
    anchor: "dashboard-health",
    route: "/app",
    title: { en: "The outlet's health, every morning", bn: "প্রতিদিন সকালে আউটলেটের অবস্থা" },
    body: {
      en: "One score from four pillars: checklists done, sales, stock and guests. Green, amber or red. Tap any pillar to see exactly which numbers made it.",
      bn: "চারটি স্তম্ভ থেকে একটি স্কোর: চেকলিস্ট, বিক্রি, স্টক ও অতিথি। সবুজ, হলুদ বা লাল। কোন সংখ্যা থেকে এল দেখতে যেকোনো স্তম্ভে চাপুন।",
    },
  },
  {
    id: "review-queue",
    anchor: "nav-review",
    route: "/app",
    title: { en: "Review queue: your daily job", bn: "রিভিউ কিউ: আপনার দৈনিক কাজ" },
    body: {
      en: "Every checklist staff submit lands here with its photos. You approve or send it back. A run you submitted yourself can never be approved by you.",
      bn: "স্টাফ যে চেকলিস্ট জমা দেয়, ছবিসহ এখানে আসে। আপনি অনুমোদন করেন বা ফেরত পাঠান। নিজের জমা দেওয়া রান নিজে অনুমোদন করা যায় না।",
    },
  },
  {
    id: "exceptions",
    anchor: "nav-exceptions",
    route: "/app",
    title: { en: "Exceptions: what went wrong", bn: "এক্সেপশন: কোথায় সমস্যা হল" },
    body: {
      en: "Missed checklists, failed critical items, doubtful photos and stock anomalies gather here. Acknowledge them, assign them, resolve them with a note.",
      bn: "মিস হওয়া চেকলিস্ট, ফেল করা জরুরি আইটেম, সন্দেহজনক ছবি ও স্টকের অসঙ্গতি এখানে জমা হয়। দেখুন, কাউকে দিন, নোটসহ সমাধান করুন।",
    },
  },
  {
    id: "sales",
    anchor: "nav-sales",
    route: "/app",
    title: {
      en: "Sales: upload the Petpooja exports",
      bn: "বিক্রি: Petpooja এক্সপোর্ট আপলোড করুন",
    },
    body: {
      en: "Drop the Orders Master, Order Listing and Category reports here. The app checks the restaurant name, then builds attach rates, forecasts and the sales pillar from them.",
      bn: "Orders Master, Order Listing ও Category রিপোর্ট এখানে দিন। অ্যাপ রেস্তোরাঁর নাম যাচাই করে, তারপর অ্যাটাচ রেট, পূর্বাভাস ও বিক্রির স্তম্ভ তৈরি করে।",
    },
  },
  {
    id: "stock-counts",
    anchor: "nav-stock-counts",
    route: "/app",
    title: { en: "Stock counts and requisitions", bn: "স্টক গণনা ও রিকুইজিশন" },
    body: {
      en: "Photograph a count sheet; the app reads it and asks you to confirm each line. Confirmed counts feed consumption, anomalies and the requisition list.",
      bn: "কাউন্ট শিটের ছবি তুলুন; অ্যাপ পড়ে প্রতিটি লাইন নিশ্চিত করতে বলে। নিশ্চিত গণনা থেকে খরচ, অসঙ্গতি ও রিকুইজিশন তালিকা আসে।",
    },
  },
  {
    id: "templates",
    anchor: "nav-sop-templates",
    route: "/app",
    title: { en: "SOP templates and assignments", bn: "SOP টেমপ্লেট ও অ্যাসাইনমেন্ট" },
    body: {
      en: "Templates are the checklists themselves, versioned so history never changes under you. Assignments say which outlet runs which template, when, and for which role.",
      bn: "টেমপ্লেটই চেকলিস্ট, সংস্করণসহ, তাই ইতিহাস বদলায় না। অ্যাসাইনমেন্ট বলে কোন আউটলেটে কোন টেমপ্লেট, কখন, কোন ভূমিকার জন্য চলবে।",
    },
  },
  {
    id: "reference-photos",
    anchor: "nav-reference-photos",
    route: "/app",
    title: {
      en: "Reference photos: what 'clean' looks like",
      bn: "রেফারেন্স ছবি: 'পরিষ্কার' দেখতে কেমন",
    },
    body: {
      en: "Capture one good photo per item at your outlet. The AI reviewer compares every submitted photo against it; without one it can only guess.",
      bn: "আপনার আউটলেটে প্রতিটি আইটেমের একটি ভালো ছবি তুলে রাখুন। AI রিভিউয়ার প্রতিটি জমা দেওয়া ছবি এর সঙ্গে মেলায়; এটি না থাকলে শুধু অনুমান করে।",
    },
  },
  {
    id: "people",
    anchor: "nav-people",
    route: "/app",
    title: { en: "People: roles, PINs and training", bn: "মানুষ: ভূমিকা, PIN ও প্রশিক্ষণ" },
    body: {
      en: "Invite managers, set staff PINs for the shared tablet, and see who has finished this walkthrough. Restart someone's training from their card when a person changes.",
      bn: "ম্যানেজারদের আমন্ত্রণ জানান, শেয়ার্ড ট্যাবলেটের জন্য স্টাফের PIN দিন, আর কে এই পরিচয় শেষ করেছে দেখুন। কেউ বদলালে তাঁর কার্ড থেকে প্রশিক্ষণ আবার চালু করুন।",
    },
  },
  {
    id: "tablets",
    anchor: "nav-tablets",
    route: "/app",
    roles: ADMIN,
    title: { en: "Tablets: the shared floor device", bn: "ট্যাবলেট: ফ্লোরের শেয়ার্ড ডিভাইস" },
    body: {
      en: "Each outlet's tablet has its own device account. Register it here once; staff then identify on it with their PIN. Revoke it here if a tablet goes missing.",
      bn: "প্রতিটি আউটলেটের ট্যাবলেটের নিজস্ব ডিভাইস অ্যাকাউন্ট আছে। একবার এখানে নিবন্ধন করুন; স্টাফ তারপর PIN দিয়ে চেনায়। ট্যাবলেট হারালে এখান থেকে বাতিল করুন।",
    },
  },
  {
    id: "settings",
    anchor: "nav-settings",
    route: "/app",
    roles: ADMIN,
    title: { en: "Settings and job runs", bn: "সেটিংস ও জব রান" },
    body: {
      en: "Targets, weights and the scheduled job times live in Settings, with history. Job Runs shows every automatic job that ran overnight and whether it succeeded.",
      bn: "লক্ষ্য, ওজন ও নির্ধারিত জবের সময় সেটিংসে থাকে, ইতিহাসসহ। Job Runs-এ রাতে চলা প্রতিটি স্বয়ংক্রিয় জব ও তার ফলাফল দেখা যায়।",
    },
  },
  {
    id: "signout",
    anchor: "signout",
    route: "/app",
    title: {
      en: "Sign out when you leave a shared device",
      bn: "শেয়ার্ড ডিভাইস ছাড়ার সময় সাইন আউট করুন",
    },
    body: {
      en: "Your login can approve checklists and change settings. On a tablet or phone that others touch, sign out when you are done.",
      bn: "আপনার লগইন দিয়ে চেকলিস্ট অনুমোদন ও সেটিংস বদলানো যায়। অন্যরা যে ট্যাবলেট বা ফোন ব্যবহার করে, সেখানে কাজ শেষে সাইন আউট করুন।",
    },
  },
  {
    id: "done",
    anchor: null,
    route: "/app",
    title: { en: "That is the tour", bn: "পরিচয় শেষ" },
    body: {
      en: "Your completion is recorded with today's date. You can run this again any time from the bottom of the menu.",
      bn: "আপনার সম্পন্ন করা আজকের তারিখসহ নথিভুক্ত হল। মেনুর নিচ থেকে যেকোনো সময় আবার দেখতে পারেন।",
    },
  },
];

export const FLOOR_STEPS: readonly TourStep[] = [
  {
    id: "welcome",
    anchor: null,
    route: "/floor",
    title: { en: "Welcome to the AKIRA tablet", bn: "AKIRA ট্যাবলেটে স্বাগতম" },
    body: {
      en: "A one-minute walk through the tablet before your first checklist. Tap Next to move on.",
      bn: "প্রথম চেকলিস্টের আগে ট্যাবলেটের এক মিনিটের পরিচয়। এগোতে Next চাপুন।",
    },
  },
  {
    id: "you",
    anchor: "floor-switch",
    route: "/floor",
    title: { en: "This is you", bn: "এটি আপনি" },
    body: {
      en: "Your name shows here after you enter your PIN. Everything you do on this tablet is recorded under your name. Never share your PIN.",
      bn: "PIN দেওয়ার পর এখানে আপনার নাম দেখায়। এই ট্যাবলেটে আপনি যা করবেন সব আপনার নামে নথিভুক্ত হয়। PIN কাউকে বলবেন না।",
    },
  },
  {
    id: "today",
    anchor: "floor-today",
    route: "/floor",
    title: { en: "Today's checklists", bn: "আজকের চেকলিস্ট" },
    body: {
      en: "The list shows what is due for your role today, with its due time. Overdue ones turn red. Finished ones show as waiting for review or approved.",
      bn: "আজ আপনার ভূমিকার জন্য যা করার আছে, সময়সহ এখানে দেখায়। দেরি হলে লাল হয়ে যায়। শেষ হলে 'রিভিউর অপেক্ষায়' বা 'অনুমোদিত' দেখায়।",
    },
  },
  {
    id: "run-card",
    anchor: "floor-run-card",
    route: "/floor",
    title: { en: "Open a checklist", bn: "একটি চেকলিস্ট খুলুন" },
    body: {
      en: "Tap a card to start. Items come one at a time: read the instruction, do the task, then answer Pass, Fail or Not applicable.",
      bn: "শুরু করতে কার্ডে চাপুন। আইটেম একটি একটি করে আসে: নির্দেশ পড়ুন, কাজটি করুন, তারপর Pass, Fail বা Not applicable বেছে নিন।",
    },
  },
  {
    id: "photos",
    anchor: null,
    route: "/floor",
    title: { en: "Photo proof", bn: "ছবির প্রমাণ" },
    body: {
      en: "Some items ask for a photo. Photograph the work, not people. The photo is checked against a reference shot and reviewed by a manager; it also goes to an AI service for an advisory opinion.",
      bn: "কিছু আইটেমে ছবি লাগে। কাজের ছবি তুলুন, মানুষের নয়। ছবিটি রেফারেন্স ছবির সঙ্গে মেলানো হয় ও ম্যানেজার দেখেন; পরামর্শের জন্য একটি AI পরিষেবাতেও যায়।",
    },
  },
  {
    id: "offline",
    anchor: null,
    route: "/floor",
    title: { en: "If the wifi drops", bn: "ওয়াইফাই চলে গেলে" },
    body: {
      en: "Keep going. Your answers and photos are saved on the tablet and sent when the connection returns. A run is never lost half-way.",
      bn: "কাজ চালিয়ে যান। উত্তর ও ছবি ট্যাবলেটে জমা থাকে, সংযোগ ফিরলে পাঠানো হয়। অর্ধেক করা রান কখনও হারায় না।",
    },
  },
  {
    id: "submit",
    anchor: null,
    route: "/floor",
    title: { en: "Review and submit", bn: "দেখে নিয়ে জমা দিন" },
    body: {
      en: "At the end you see everything you answered. Submit sends it to a manager for approval. Sent back? Fix the items and submit again.",
      bn: "শেষে আপনার সব উত্তর একসঙ্গে দেখায়। Submit চাপলে ম্যানেজারের অনুমোদনে যায়। ফেরত এলে আইটেমগুলো ঠিক করে আবার জমা দিন।",
    },
  },
  {
    id: "handover",
    anchor: "floor-handover",
    route: "/floor",
    title: { en: "Hand over when you are done", bn: "কাজ শেষে হস্তান্তর করুন" },
    body: {
      en: "Tap 'switch' or 'Hand over' so the next person enters their own PIN. Otherwise their work is recorded under your name.",
      bn: "'switch' বা 'Hand over' চাপুন, যাতে পরের জন নিজের PIN দেয়। নইলে তাঁর কাজ আপনার নামে লেখা হবে।",
    },
  },
  {
    id: "done",
    anchor: null,
    route: "/floor",
    title: { en: "Ready", bn: "প্রস্তুত" },
    body: {
      en: "That is all. Your training is recorded with today's date. Ask your manager if anything is unclear.",
      bn: "এটুকুই। আপনার প্রশিক্ষণ আজকের তারিখসহ নথিভুক্ত হল। কিছু অস্পষ্ট লাগলে ম্যানেজারকে জিজ্ঞাসা করুন।",
    },
  },
];

export const UI = {
  chooseLanguage: { en: "Choose your language", bn: "আপনার ভাষা বেছে নিন" },
  languageHint: {
    en: "You can switch at any step.",
    bn: "যেকোনো ধাপে বদলাতে পারবেন।",
  },
  next: { en: "Next", bn: "পরের ধাপ" },
  back: { en: "Back", bn: "আগের ধাপ" },
  finish: { en: "Finish", bn: "শেষ করুন" },
  skip: { en: "Skip (owner)", bn: "এড়িয়ে যান (মালিক)" },
  saving: { en: "Saving…", bn: "সংরক্ষণ হচ্ছে…" },
  required: {
    en: "This walkthrough has to be finished before the app opens.",
    bn: "অ্যাপ খোলার আগে এই পরিচয় শেষ করতে হবে।",
  },
  failed: {
    en: "Could not save your progress. Check the wifi and tap again.",
    bn: "অগ্রগতি সংরক্ষণ করা গেল না। ওয়াইফাই দেখে আবার চাপুন।",
  },
} as const;
