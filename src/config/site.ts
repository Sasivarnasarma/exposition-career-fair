type SiteConfig = {
  name: string;
  edition: string;
  year: number;
  mainWebsite: string;
  organiser: string;
  university: string;
  collaborator: string;
  registrationOpen: boolean;
  eventDate: string | null;
  venue: string | null;
  registrationDeadline: string | null;
  contactEmail: string | null;
  whatsappCommunityUrl: string | null;
};

export const site: SiteConfig = {
  name: "Exposition Career Fair",
  edition: "Issue 22",
  year: 2027,
  mainWebsite: "https://exposition.lk",
  organiser: "Industrial Management Science Students’ Association",
  university: "University of Kelaniya",
  collaborator: "IEEE Sri Lanka",
  // Enable only after submission, privacy, and operational launch checks pass.
  registrationOpen: false,
  eventDate: null,
  venue: null,
  registrationDeadline: null,
  contactEmail: "exposition.mit@gmail.com",
  whatsappCommunityUrl: null,
};
