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
  registrationOpen: true,
  eventDate: null,
  venue: null,
  registrationDeadline: null,
  contactEmail: "exposition.mit@gmail.com",
  whatsappCommunityUrl:
    process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL?.trim() || null,
};
