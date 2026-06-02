// @ts-nocheck
'use client';


import React from "react";
/* ============================================================
   ICON LIBRARY — minimal stroke style, 16/18px
   ============================================================ */

const Icon = ({ name, size = 16, stroke = 1.5, ...rest }) => {
  const paths = ICONS[name];
  if (!paths) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths}
    </svg>
  );
};

const ICONS = {
  // Navigation
  search:        <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  command:       <><path d="M6 6h3a3 3 0 1 1-3 3V6Z M18 18h-3a3 3 0 1 1 3-3v3Z M6 18v-3a3 3 0 1 1 3 3H6Z M18 6v3a3 3 0 1 1-3-3h3Z" /></>,
  chevDown:      <><path d="m6 9 6 6 6-6" /></>,
  chevRight:     <><path d="m9 6 6 6-6 6" /></>,
  chevLeft:      <><path d="m15 6-6 6 6 6" /></>,
  chevUp:        <><path d="m6 15 6-6 6 6" /></>,
  menu:          <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  arrowRight:    <><path d="M5 12h14M13 5l7 7-7 7" /></>,
  arrowUp:       <><path d="M12 19V5M5 12l7-7 7 7" /></>,
  arrowDown:     <><path d="M12 5v14M5 12l7 7 7-7" /></>,
  arrowUpRight:  <><path d="M7 17 17 7M8 7h9v9" /></>,
  external:      <><path d="M15 3h6v6 M10 14 21 3 M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></>,
  switch:        <><path d="M8 3 4 7l4 4 M4 7h11a4 4 0 0 1 4 4v0 M16 21l4-4-4-4 M20 17H9a4 4 0 0 1-4-4v0" /></>,

  // Dashboards / modules
  home:          <><path d="M3 11.5 12 4l9 7.5 M5 10v10h14V10" /></>,
  dashboard:     <><rect x="3" y="3"  width="8" height="9" rx="1.5" /><rect x="13" y="3"  width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="14" width="8" height="7" rx="1.5" /></>,
  master:        <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18" /></>,
  shield:        <><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9.5 4.5-1 8-4.5 8-9.5V6l-8-3Z" /></>,
  crown:         <><path d="m3 8 4 4 5-7 5 7 4-4-2 11H5L3 8Z" /></>,
  factory:       <><path d="M3 21h18 M5 21V11l5 3V9l5 3V9l4 3v9 M9 21v-4 M14 21v-4 M18 21v-4" /></>,
  truck:         <><rect x="2" y="6" width="12" height="10" rx="1" /><path d="M14 9h4l3 4v3h-7 M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></>,
  // Modules
  box:           <><path d="M21 8 12 3 3 8l9 5 9-5ZM3 8v8l9 5 9-5V8 M12 13v10" /></>,
  package:       <><path d="M16 3.13a4 4 0 0 1 0 7.74 M22 11v8a2 2 0 0 1-2 2h-3 M3 14h4l3 7 4-14 3 7h4" /></>,
  wrench:        <><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-3 3 2 2 3-3Z" /></>,
  users:         <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" /></>,
  user:          <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  cart:          <><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M3 4h2l2.4 12h13L23 7H6" /></>,
  invoice:       <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z M14 3v6h6 M9 13h6M9 17h4" /></>,
  badge:         <><circle cx="12" cy="8" r="5" /><path d="m8.21 13.89-1.21 6.61 5-3 5 3-1.21-6.62" /></>,
  clock:         <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendar:      <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
  money:         <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 12h.01M18 12h.01" /></>,
  chart:         <><path d="M3 21h18 M7 17V9 M12 17V5 M17 17v-7" /></>,
  pieChart:      <><path d="M12 3v9h9a9 9 0 1 1-9-9Z" /><path d="M15 3a9 9 0 0 1 6 6h-6V3Z" /></>,
  layers:        <><path d="M12 3 2 9l10 6 10-6-10-6Z M2 17l10 6 10-6 M2 13l10 6 10-6" /></>,
  bell:          <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10 21a2 2 0 0 0 4 0" /></>,
  bellOff:       <><path d="M13.73 21a2 2 0 0 1-3.46 0 M18.63 13A18 18 0 0 1 18 8 M6.26 6.26A6 6 0 0 0 6 8c0 7-3 9-3 9h14 M18 8a6 6 0 0 0-9.33-5 M2 2l20 20" /></>,
  pin:           <><path d="M12 22s-7-7.58-7-13a7 7 0 0 1 14 0c0 5.42-7 13-7 13Z" /><circle cx="12" cy="9" r="2.5" /></>,
  map:           <><path d="M9 4 3 6v15l6-2 6 2 6-2V4l-6 2-6-2Z M9 4v15 M15 6v15" /></>,
  filter:        <><path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z" /></>,
  sort:          <><path d="M3 6h18M6 12h12M10 18h4" /></>,
  plus:          <><path d="M12 5v14M5 12h14" /></>,
  minus:         <><path d="M5 12h14" /></>,
  x:             <><path d="M18 6 6 18M6 6l12 12" /></>,
  check:         <><path d="M20 6 9 17l-5-5" /></>,
  checkSm:       <><path d="M20 6 9 17l-5-5" /></>,
  alert:         <><path d="M12 9v4M12 17h.01 M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /></>,
  info:          <><circle cx="12" cy="12" r="9" /><path d="M12 16v-5M12 8h.01" /></>,
  more:          <><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>,
  moreV:         <><circle cx="12" cy="5" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="12" cy="19" r="1.2" /></>,
  download:      <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
  upload:        <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></>,
  fileText:      <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z M14 3v6h6 M16 13H8M16 17H8M10 9H8" /></>,
  refresh:       <><path d="M3 12a9 9 0 0 1 15-6.7L21 8 M3 3v5h5 M21 12a9 9 0 0 1-15 6.7L3 16 M21 21v-5h-5" /></>,
  eye:           <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff:        <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" /></>,
  edit:          <><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" /></>,
  trash:         <><path d="M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M10 11v6M14 11v6" /></>,
  lock:          <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4" /></>,
  mail:          <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 7 10-7" /></>,
  phone:         <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.34 1.9.66 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.54 2.81.66A2 2 0 0 1 22 16.92Z" /></>,
  building:      <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" /></>,
  settings:      <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>,
  help:          <><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" /></>,
  bolt:          <><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" /></>,
  logout:        <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" /></>,
  // misc
  weight:        <><path d="M6.5 6h11l1.8 14a1.5 1.5 0 0 1-1.5 1.7H6.2a1.5 1.5 0 0 1-1.5-1.7L6.5 6Z M9 6a3 3 0 1 1 6 0" /></>,
  flask:         <><path d="M9 3h6 M10 3v6L4 19a2 2 0 0 0 1.7 3h12.6A2 2 0 0 0 20 19l-6-10V3" /></>,
  bag:           <><path d="M6 8h12l-1 13H7L6 8Z M9 8V6a3 3 0 1 1 6 0v2" /></>,
  ticket:        <><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7Z" /></>,
  loader:        <><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></>,
  pause:         <><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></>,
  play:          <><path d="m6 4 14 8-14 8V4Z" /></>,
  layout:        <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>,
  archive:       <><rect x="3" y="3" width="18" height="5" rx="1" /><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8 M10 12h4" /></>,
  speech:        <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /></>,
  // brand symbol - simple chakra-like circle
  chakra:        <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M5.6 18.4l4.2-4.2M14.2 9.8l4.2-4.2" /></>,
};

export { Icon };
