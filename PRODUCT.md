
# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **Students**: University and college students experiencing academic stress, mental fatigue, anxiety, loneliness, or crises. They need a safe, confidential, frictionless place to self-assess emotional states, receive clear non-judgmental guidance, and book confidential support.
2. **Counselors & Therapists**: Campus mental health professionals reviewing flagged risk cases, triage notes, and student check-ins; managing clinical availability, scheduling, and conducting confidential support sessions.
3. **Administrators**: Campus wellness coordinators overseeing account approvals, provider verification, aggregate wellness metrics, triage workflows, and institutional crisis protocols.

## Product Purpose

Mind Bridge bridges the gap between student mental health distress and timely campus psychological support. It provides an immediate, compassionate, and structured pathway: from private wellness check-ins and objective risk evaluation to instant guidance and direct appointment scheduling with licensed campus counselors. Success is measured by reducing friction to mental health help-seeking, preventing crises from slipping through unnoticed, and ensuring student dignity and privacy at every touchpoint.

## Positioning

Unlike clinical electronic health record (EHR) systems that feel cold and bureaucratic, or generic lifestyle habit trackers, Mind Bridge is purpose-built for university campus mental health ecosystems. It blends a compassionate, destigmatizing student intake experience with a clinical triage dashboard that helps counselors prioritize urgent cases without compromising student privacy.

## Operating Context

- **Student Scenarios**: Late-night dorm check-ins under acute exam anxiety; seeking quiet help during class breaks via mobile or laptop; booking counselor slots discreetly without peer visibility.
- **Counselor Workflows**: Daily triage review of newly flagged risk assessments before morning clinic hours; managing calendar blocks; viewing timeline histories during 1-on-1 sessions.
- **Campus Environment**: Multi-device web application (desktop, tablet, mobile); strict privacy requirements; direct integration with 24/7 crisis hotlines.

## Capabilities and Constraints

- **Core Capabilities**:
  - Secure role-based authentication (Student, Counselor, Admin) with email verification and bcrypt session security.
  - Multi-dimensional wellness check-in survey assessing mood, stress, sleep, focus, and safety indicators.
  - Multi-tier risk assessment and guidance engine flagging low, moderate, and acute support needs.
  - Interactive appointment booking and counselor availability management.
  - 24/7 Crisis Resource directory with instant emergency contact hotlines and text lines.
  - Real-time confidential chat and communication channels between matched students and counselors.
  - Admin governance, account verification, and session lifecycle monitoring.
- **Constraints**:
  - Non-diagnostic disclaimer: Clear notice that assessments are clinical triage aids, not formal psychiatric diagnoses.
  - Privacy First: Sensitive response data protected and scoped strictly by verified roles.

## Brand Commitments

- **Tone & Voice**: Compassionate, reassuring, steady, transparent, and dignified. Never clinical jargon, never dismissive, never cheerful toxic positivity.
- **Identity & Name**: Mind Bridge — connecting students to care with warmth, security, and clarity.
- **Visual Personality**: Calming, grounding, intentional, and high-trust. Deep comforting indigo depths, restorative teal/emerald accents, crisp legible typography, and zero jarring neon distractions.

## Evidence on Hand

- Fully functional role-based architecture in `server/` (Express API, JWT auth, risk scoring algorithms, appointment management).
- Complete frontend client in `client/` (React + Tailwind CSS + Framer Motion) with student check-in, counselor triage view, scheduling calendar, admin panel, and settings.
- Real campus crisis resource listings and hotline protocols in `client/src/components/CrisisResources.jsx`.

## Product Principles

1. **Dignity & Psychological Safety First**: Every interaction must feel secure, respectful, and private. Never intimidate or alarm the student with harsh visual cues.
2. **Clarity Over Complexity**: In times of high emotional distress, cognitive load must be minimal. Actions (check-in, get help, book slot) are obvious and immediate.
3. **Continuous Reassurance & Actionability**: Assessment results never leave a student stranded; every score is paired with actionable guidance, self-care steps, or direct counselor booking.
4. **Clinical Precision with Human Warmth**: Counselor tools provide structured, scannable data for rapid triage while maintaining empathy in student communications.

## Accessibility & Inclusion

- WCAG AA contrast compliance across all text, forms, and interactive states.
- Full keyboard navigability with visible focus indicators across all modals, survey options, and calendar slots.
- Responsive mobile ergonomics with 44px minimum touch targets and accessible hit areas.
- Reduced motion support (`prefers-reduced-motion`) for anxiety-sensitive users.
