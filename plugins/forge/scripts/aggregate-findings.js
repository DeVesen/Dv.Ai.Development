#!/usr/bin/env node
'use strict';

const SEVERITY_RANK = { green: 1, yellow: 2, red: 3 };
const TEXT_FIELDS = ['location', 'quote', 'consequence', 'rationale'];
const JSON_BLOCK = /```json[ \t]*\r?\n([\s\S]*?)\r?\n```/g;

function normalizeLocation(location) {
  const collapsed = String(location).trim().replace(/\s+/g, ' ').toLowerCase();
  const acId = /^ac-0*(\d+)$/.exec(collapsed);
  return acId ? `ac-${acId[1]}` : collapsed;
}

function isValidFinding(finding) {
  return finding !== null && typeof finding === 'object'
    && TEXT_FIELDS.every((field) => typeof finding[field] === 'string')
    && finding.location.trim() !== ''
    && Object.hasOwn(SEVERITY_RANK, finding.severity);
}

function isValidReview(review) {
  return review !== null && typeof review === 'object'
    && typeof review.reviewer === 'string' && review.reviewer !== ''
    && Array.isArray(review.findings)
    && review.findings.every(isValidFinding);
}

function parseReview(body, errors) {
  try {
    const review = JSON.parse(body);
    if (isValidReview(review)) return review;
    errors.push(`Block verletzt das Findings-Format: ${String(review?.reviewer ?? 'unbekannt')}`);
  } catch (error) {
    errors.push(`Ungültiges JSON: ${error.message}`);
  }
  return null;
}

function extractReviews(text) {
  const reviews = new Map();
  const errors = [];
  for (const [, body] of String(text).matchAll(JSON_BLOCK)) {
    const review = parseReview(body, errors);
    if (review) reviews.set(review.reviewer, review);
  }
  return { reviews: [...reviews.values()], errors };
}

module.exports = { SEVERITY_RANK, normalizeLocation, extractReviews };
