const pccUsers = [
  {
    id: "pcc-harry-mangubat",
    name: "Harry Mangubat",
    email: "harry.mangubat@company.local",
    role: "PCC",
  },
  {
    id: "pcc-ian-jasper-abatayo",
    name: "Ian Jasper Abatayo",
    email: "ian.jasper.abatayo@company.local",
    role: "PCC",
  },
  {
    id: "pcc-ma-cecilia-quipman",
    name: "Ma Cecilia Quipman",
    email: "ma.cecilia.quipman@company.local",
    role: "PCC",
  },
  {
    id: "pcc-junnel-delvo",
    name: "Junnel Delvo",
    email: "junnel.delvo@company.local",
    role: "PCC",
  },
  {
    id: "pcc-ralph-go",
    name: "Ralph Go",
    email: "ralph.go@company.local",
    role: "PCC",
  },
  {
    id: "pcc-jason-rosco",
    name: "Jason Rosco",
    email: "jason.rosco@company.local",
    role: "PCC",
  },
  {
    id: "pcc-jose-nuena",
    name: "Jose Nuena",
    email: "jose.nuena@company.local",
    role: "PCC",
  },
  {
    id: "pcc-jeneev-pearl-hekin",
    name: "Jeneev Pearl Hekin",
    email: "jeneev.hekin@company.local",
    role: "PCC",
  },
  {
    id: "pcc-michael-jul-contratista",
    name: "Michael Jul Contratista",
    email: "michael.contratista@company.local",
    role: "PCC",
  },
  {
    id: "pcc-abigail-basera",
    name: "Abigail Basera",
    email: "abigail.basera@company.local",
    role: "PCC",
  },
  {
    id: "pcc-juvie-cagande",
    name: "Juvie Cagande",
    email: "juvie.cagande@company.local",
    role: "PCC",
  },
  {
    id: "pcc-reyza-cuerbo",
    name: "Reyza Cuerbo",
    email: "reyza.cuerbo@company.local",
    role: "PCC",
  },
  {
    id: "pcc-daryl-acera",
    name: "Daryl Acera",
    email: "daryl.acera@company.local",
    role: "PCC",
  },
];

function findPccByName(name) {
  if (!name) {
    return null;
  }

  const normalizedName = String(name)
    .trim()
    .toLowerCase();

  return (
    pccUsers.find(
      (user) =>
        user.name.toLowerCase() ===
        normalizedName
    ) || null
  );
}

module.exports = {
  pccUsers,
  findPccByName,
};
