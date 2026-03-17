/**
 * Member Initialization Data
 *
 * Contient les données de tous les utilisateurs OJYQ
 * Format email: firstname.lastname@ojyq.org
 * Password: -Yira2026:
 *
 * À exécuter une seule fois lors du premier setup via Cloud Function
 */

export const membersInitData = [
  // Administrator
  {
    email: "info@ojyq.org",
    firstName: "Admin",
    lastName: "OJYQ",
    role: "admin",
    password: "-Yira2025:",
  },

  // Secretariat
  {
    email: "giviakavira.tumbura@ojyq.org",
    firstName: "Givia Kavira",
    lastName: "Tumbura",
    role: "secretaire",
    password: "-Yira2026:",
  },
  {
    email: "christian.ngavo@ojyq.org",
    firstName: "Christian",
    lastName: "Ngavo",
    role: "secretaire",
    password: "-Yira2026:",
  },

  // Tresorerie
  {
    email: "robert.nzanzu@ojyq.org",
    firstName: "Robert",
    lastName: "Nzanzu",
    role: "tresorier",
    password: "-Yira2026:",
  },
  {
    email: "roseajabu.nzanzu@ojyq.org",
    firstName: "Rose Ajabu",
    lastName: "Nzanzu",
    role: "tresorier",
    password: "-Yira2026:",
  },

  // Loisir
  {
    email: "maggiekahindo.tumbura@ojyq.org",
    firstName: "Maggie Kahindo",
    lastName: "Tumbura",
    role: "loisir",
    password: "-Yira2026:",
  },
  {
    email: "aureliekavira.kawaya@ojyq.org",
    firstName: "Aurelie Kavira",
    lastName: "Kawaya",
    role: "loisir",
    password: "-Yira2026:",
  },

  // Conseillere
  {
    email: "lumierekyakimwa.vitsange@ojyq.org",
    firstName: "Lumiere Kyakimwa",
    lastName: "Vitsange",
    role: "conseillere",
    password: "-Yira2026:",
  },

  // President
  {
    email: "eusebe.hangi-kisoni@ojyq.org",
    firstName: "Eusebe",
    lastName: "Hangi Kisoni",
    role: "president",
    password: "-Yira2026:",
  },
  {
    email: "kamabu.ndungo@ojyq.org",
    firstName: "Kamabu",
    lastName: "Ndungo",
    role: "president",
    password: "-Yira2026:",
  },

  // Communication
  {
    email: "precieuse.masika.vindu@ojyq.org",
    firstName: "Precieuse Masika",
    lastName: "Vindu",
    role: "communication",
    password: "-Yira2026:",
  },
  {
    email: "kambale.tumbura@ojyq.org",
    firstName: "Kambale",
    lastName: "Tumbura",
    role: "communication",
    password: "-Yira2026:",
  },

  // Membre
  {
    email: "lea.kavhugho@ojyq.org",
    firstName: "Lea",
    lastName: "Kavhugho",
    role: "Membre",
    password: "-Yira2026:",
  },
  {
    email: "samuelnzoli.lwanzo@ojyq.org",
    firstName: "Samuel Nzoli",
    lastName: "Lwanzo",
    role: "Membre",
    password: "-Yira2026:",
  },
];

/**
 * Types pour TypeScript
 */
export type MemberInitData = {
  email: string;
  firstName: string;
  lastName: string;
  role:
    | "admin"
    | "tresorier"
    | "secretaire"
    | "president"
    | "loisir"
    | "conseillere"
    | "communication"
    | "Membre";
  password: string;
};

export type FirestoreUserData = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
  avatarPreset: null;
};

export type FirestorePaymentData = {
  paidThisYear: number;
  debt: number;
  lastPaymentDate: null;
  createdAt: string;
};
