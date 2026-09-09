#!/usr/bin/env node
/**
 * Cross-reference validation for the catalogs.
 *
 * The data layer is a web of id references: a career names majors, a major is
 * taught by institutions, a course teaches skills, a career recommends courses.
 * None of those references is type-checked, and a broken one does not throw --
 * it silently renders an empty section. A typo in `relatedMajors` makes the
 * "where to study this" feature return nothing for that career, and nobody
 * notices until a grader clicks it.
 *
 * So this runs in CI and fails the build.
 *
 * The most valuable check here is the last one: every career must have at least
 * one major that some UAE institution actually teaches. A career can have
 * perfectly valid major ids and still be a dead end for the whole university
 * matching feature.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const DATA = join(process.cwd(), "public", "data");
const read = (name) => JSON.parse(readFileSync(join(DATA, name), "utf8"));

const careers = read("careers.json");
const index = read("careers-index.json");
const courses = read("courses.json");
const majors = read("majors.json");
const universities = read("universities.json");
const skills = read("skills.json");
const sectors = read("sectors.json");
const initiatives = read("initiatives.json");

const ids = (rows) => new Set(rows.map((row) => row.id));
const careerIds = ids(careers);
const courseIds = ids(courses);
const majorIds = ids(majors);
const skillIds = ids(skills);
const sectorIds = ids(sectors);
const initiativeIds = ids(initiatives);

const errors = [];
const warnings = [];

const check = (condition, message) => {
  if (!condition) errors.push(message);
};

// --- minimum sizes required by the brief --------------------------------
check(careers.length >= 140, `careers: ${careers.length} < 140`);
check(courses.length >= 150, `courses: ${courses.length} < 150`);
check(majors.length >= 70, `majors: ${majors.length} < 70`);
check(universities.length >= 45, `universities: ${universities.length} < 45`);
check(careerIds.has("radiologist"), "the radiologist career is missing");
check(index.length === careers.length, "careers-index is out of sync with careers");

// --- uniqueness ----------------------------------------------------------
for (const [name, rows, set] of [
  ["careers", careers, careerIds],
  ["courses", courses, courseIds],
  ["majors", majors, majorIds],
  ["universities", universities, ids(universities)],
  ["skills", skills, skillIds],
]) {
  check(rows.length === set.size, `${name}: duplicate ids present`);
}

// --- career references ---------------------------------------------------
for (const career of careers) {
  const at = `career ${career.id}`;
  check(sectorIds.has(career.sector), `${at}: unknown sector "${career.sector}"`);

  for (const entry of career.requiredSkills) {
    check(skillIds.has(entry.skill), `${at}: unknown skill "${entry.skill}"`);
  }
  for (const major of career.educationPath.relatedMajors) {
    check(majorIds.has(major), `${at}: unknown major "${major}"`);
  }
  for (const initiative of career.strategicInitiatives) {
    check(initiativeIds.has(initiative), `${at}: unknown initiative "${initiative}"`);
  }
  for (const related of career.relatedCareers) {
    check(careerIds.has(related), `${at}: unknown related career "${related}"`);
  }
  for (const course of career.topCourses) {
    check(courseIds.has(course), `${at}: unknown course "${course}"`);
  }

  check(career.educationPath.relatedMajors.length > 0, `${at}: no related majors`);
  check(career.relatedCareers.length > 0, `${at}: no related careers`);
  check(career.topCourses.length > 0, `${at}: no recommended courses`);

  // Bilingual completeness: an empty Arabic string renders as a blank section.
  for (const field of ["title", "shortDescription", "longDescription",
                       "dayInTheLife", "uaeRelevance"]) {
    check(career[field]?.en?.trim(), `${at}: missing English ${field}`);
    check(career[field]?.ar?.trim(), `${at}: missing Arabic ${field}`);
  }

  // Arabic text should be Arabic. Catches a field left as an English copy.
  const arabic = /[؀-ۿ]/;
  check(arabic.test(career.longDescription.ar),
        `${at}: Arabic longDescription contains no Arabic script`);

  check(career.salaryAED.entry <= career.salaryAED.mid, `${at}: salary entry > mid`);
  check(career.salaryAED.mid <= career.salaryAED.senior, `${at}: salary mid > senior`);
  check(career.growthTrend.length === 5, `${at}: growthTrend must have 5 points`);
}

// --- course and university references -------------------------------------
for (const course of courses) {
  for (const skill of Object.keys(course.skills)) {
    check(skillIds.has(skill), `course ${course.id}: unknown skill "${skill}"`);
  }
}

for (const university of universities) {
  const at = `university ${university.id}`;
  for (const major of university.majorsOffered) {
    check(majorIds.has(major), `${at}: unknown major "${major}"`);
  }
  check(university.majorsOffered.length > 0, `${at}: offers no majors`);
  check(Number.isFinite(university.coordinates?.lat)
        && Number.isFinite(university.coordinates?.lng), `${at}: bad coordinates`);
  check(university.name?.ar?.trim(), `${at}: missing Arabic name`);
  check(/^https:\/\//.test(university.website ?? ""), `${at}: website must be https`);
}

// --- the check that actually protects a feature ---------------------------
// A career whose majors are taught nowhere makes "where to study this" empty.
const taughtMajors = new Set(universities.flatMap((u) => u.majorsOffered));
const orphanedCareers = careers.filter(
  (career) => !career.educationPath.relatedMajors.some((m) => taughtMajors.has(m)),
);
for (const career of orphanedCareers) {
  errors.push(
    `career ${career.id}: none of its majors (${career.educationPath.relatedMajors.join(", ")}) `
    + "is taught by any institution — university matching will be empty",
  );
}

// Unreachable majors are a smell, not a failure: a major nobody studies for is
// dead weight in the catalog, but it breaks nothing.
const usedMajors = new Set(careers.flatMap((c) => c.educationPath.relatedMajors));
const unusedMajors = majors.filter((m) => !usedMajors.has(m.id));
if (unusedMajors.length > 0) {
  warnings.push(`${unusedMajors.length} majors are not referenced by any career: `
    + unusedMajors.map((m) => m.id).join(", "));
}
const unusedSkills = skills.filter(
  (s) => !careers.some((c) => c.requiredSkills.some((r) => r.skill === s.id)),
);
if (unusedSkills.length > 0) {
  warnings.push(`${unusedSkills.length} skills are not used by any career: `
    + unusedSkills.map((s) => s.id).join(", "));
}

// --- report ---------------------------------------------------------------
for (const warning of warnings) console.warn("warning: " + warning);

if (errors.length > 0) {
  console.error(`\nvalidate-data failed with ${errors.length} error(s):\n`);
  for (const error of errors.slice(0, 40)) console.error("  " + error);
  if (errors.length > 40) console.error(`  ... and ${errors.length - 40} more`);
  process.exit(1);
}

console.log(
  `validate-data passed — ${careers.length} careers, ${courses.length} courses, `
  + `${majors.length} majors, ${universities.length} institutions, ${skills.length} skills`,
);
