/**
 * Nationality-specific name databases for character generation
 *
 * This data enables culturally appropriate name generation based on character nationality.
 * Each nationality includes first names (male/female) and surnames, with optional naming conventions.
 */

export interface NationalityNameData {
  firstNames: {
    male: string[];
    female: string[];
  };
  surnames: string[];
  namingConvention?: string; // Special naming patterns (e.g., "patronymic" for Russian)
}

export const NATIONALITY_NAMES: Record<string, NationalityNameData> = {
  british: {
    firstNames: {
      male: [
        'Oliver', 'George', 'Harry', 'Jack', 'Jacob', 'Noah', 'Charlie', 'Muhammad', 'Thomas', 'Oscar',
        'William', 'James', 'Henry', 'Edward', 'Arthur', 'Frederick', 'Alexander', 'Benjamin', 'Samuel', 'Daniel',
        'Lewis', 'Alfie', 'Leo', 'Archie', 'Ethan', 'Theodore', 'Sebastian', 'Harrison', 'Finley', 'Mason'
      ],
      female: [
        'Olivia', 'Amelia', 'Isla', 'Ava', 'Emily', 'Isabella', 'Mia', 'Poppy', 'Ella', 'Lily',
        'Charlotte', 'Sophie', 'Grace', 'Evie', 'Ruby', 'Sophia', 'Chloe', 'Jessica', 'Freya', 'Florence',
        'Alice', 'Elizabeth', 'Victoria', 'Rose', 'Emma', 'Harper', 'Daisy', 'Scarlett', 'Lucy', 'Matilda'
      ]
    },
    surnames: [
      'Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies', 'Wilson', 'Evans', 'Thomas', 'Roberts',
      'Johnson', 'Lewis', 'Walker', 'Robinson', 'Wood', 'Thompson', 'White', 'Watson', 'Jackson', 'Wright',
      'Green', 'Harris', 'Cooper', 'King', 'Lee', 'Martin', 'Clarke', 'James', 'Morgan', 'Hughes',
      'Edwards', 'Hill', 'Moore', 'Clark', 'Harrison', 'Scott', 'Young', 'Morris', 'Hall', 'Ward'
    ]
  },

  american: {
    firstNames: {
      male: [
        'Liam', 'Noah', 'Oliver', 'Elijah', 'James', 'William', 'Benjamin', 'Lucas', 'Henry', 'Theodore',
        'Jack', 'Levi', 'Alexander', 'Jackson', 'Mateo', 'Daniel', 'Michael', 'Mason', 'Sebastian', 'Ethan',
        'Logan', 'Owen', 'Samuel', 'Jacob', 'Asher', 'Aiden', 'John', 'Joseph', 'Wyatt', 'David'
      ],
      female: [
        'Emma', 'Olivia', 'Ava', 'Charlotte', 'Sophia', 'Amelia', 'Isabella', 'Mia', 'Evelyn', 'Harper',
        'Luna', 'Camila', 'Gianna', 'Elizabeth', 'Eleanor', 'Ella', 'Abigail', 'Sofia', 'Avery', 'Scarlett',
        'Emily', 'Aria', 'Penelope', 'Chloe', 'Layla', 'Mila', 'Nora', 'Hazel', 'Madison', 'Ellie'
      ]
    },
    surnames: [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
      'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
      'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
      'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
    ]
  },

  russian: {
    firstNames: {
      male: [
        'Alexander', 'Dmitri', 'Ivan', 'Mikhail', 'Nikolai', 'Sergei', 'Andrei', 'Vladimir', 'Alexei', 'Boris',
        'Viktor', 'Pavel', 'Anton', 'Konstantin', 'Maxim', 'Yuri', 'Oleg', 'Evgeny', 'Roman', 'Leonid',
        'Ilya', 'Artem', 'Kirill', 'Denis', 'Timur', 'Stanislav', 'Ruslan', 'Vasily', 'Grigory', 'Anatoly'
      ],
      female: [
        'Anastasia', 'Ekaterina', 'Maria', 'Natalia', 'Olga', 'Svetlana', 'Tatiana', 'Elena', 'Irina', 'Anna',
        'Yulia', 'Oksana', 'Vera', 'Larisa', 'Galina', 'Lyudmila', 'Nina', 'Valentina', 'Daria', 'Sofia',
        'Yelena', 'Polina', 'Alina', 'Kira', 'Veronika', 'Arina', 'Alexandra', 'Victoria', 'Diana', 'Kristina'
      ]
    },
    surnames: [
      'Ivanov', 'Petrov', 'Sidorov', 'Volkov', 'Sokolov', 'Lebedev', 'Kozlov', 'Novikov', 'Morozov', 'Popov',
      'Vasiliev', 'Solovyov', 'Mikhailov', 'Fedorov', 'Smirnov', 'Borisov', 'Kuznetsov', 'Romanov', 'Orlov', 'Medvedev',
      'Alexeyev', 'Pavlov', 'Nikolaev', 'Andreev', 'Sergeev', 'Grigoriev', 'Antonov', 'Voronov', 'Maksimov', 'Zakharov'
    ],
    namingConvention: 'patronymic' // Russian names traditionally include patronymic (father's name + ovich/evich)
  },

  german: {
    firstNames: {
      male: [
        'Lukas', 'Leon', 'Finn', 'Noah', 'Felix', 'Paul', 'Jonas', 'Maximilian', 'Elias', 'Alexander',
        'Ben', 'Jakob', 'David', 'Anton', 'Niklas', 'Moritz', 'Emil', 'Henrik', 'Oskar', 'Johann',
        'Friedrich', 'Wilhelm', 'Karl', 'Ludwig', 'Hans', 'Otto', 'Klaus', 'Dieter', 'Wolfgang', 'Helmut'
      ],
      female: [
        'Emma', 'Hannah', 'Mia', 'Sofia', 'Anna', 'Emilia', 'Lina', 'Marie', 'Lea', 'Lena',
        'Johanna', 'Clara', 'Laura', 'Nora', 'Charlotte', 'Sophie', 'Luisa', 'Frieda', 'Greta', 'Amelie',
        'Ingrid', 'Helga', 'Ursula', 'Brigitte', 'Petra', 'Sabine', 'Monika', 'Karin', 'Heidi', 'Katrin'
      ]
    },
    surnames: [
      'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
      'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann',
      'Braun', 'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier'
    ]
  },

  french: {
    firstNames: {
      male: [
        'Gabriel', 'Raphaël', 'Louis', 'Jules', 'Adam', 'Lucas', 'Hugo', 'Arthur', 'Léo', 'Mathis',
        'Paul', 'Étienne', 'Antoine', 'Pierre', 'Jean', 'François', 'Henri', 'Laurent', 'Michel', 'Philippe',
        'Alexandre', 'Thomas', 'Nicolas', 'Maxime', 'Vincent', 'Olivier', 'Marc', 'Sébastien', 'Julien', 'David'
      ],
      female: [
        'Emma', 'Jade', 'Louise', 'Alice', 'Chloé', 'Léa', 'Manon', 'Clara', 'Camille', 'Zoé',
        'Inès', 'Sarah', 'Juliette', 'Lola', 'Lucie', 'Anaïs', 'Marie', 'Sophie', 'Charlotte', 'Émilie',
        'Céline', 'Nathalie', 'Isabelle', 'Valérie', 'Sylvie', 'Catherine', 'Brigitte', 'Françoise', 'Véronique', 'Martine'
      ]
    },
    surnames: [
      'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
      'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier',
      'Morel', 'Girard', 'André', 'Mercier', 'Blanc', 'Guerin', 'Boyer', 'Garnier', 'Chevalier', 'François'
    ]
  },

  japanese: {
    firstNames: {
      male: [
        'Haruto', 'Yuto', 'Sota', 'Riku', 'Yusei', 'Takumi', 'Hayato', 'Kaito', 'Ren', 'Daiki',
        'Akira', 'Hiroshi', 'Kenji', 'Takeshi', 'Yuki', 'Satoshi', 'Koji', 'Shiro', 'Hideo', 'Masaru',
        'Taro', 'Ichiro', 'Jiro', 'Kazuo', 'Makoto', 'Naoki', 'Ryuji', 'Shinji', 'Tatsuya', 'Yoshi'
      ],
      female: [
        'Hina', 'Yui', 'Sakura', 'Aoi', 'Rin', 'Yuna', 'Mio', 'Himari', 'Koharu', 'Mei',
        'Akari', 'Nanami', 'Haruka', 'Saki', 'Yuzuki', 'Ayaka', 'Nao', 'Emi', 'Misaki', 'Riko',
        'Yuki', 'Ayumi', 'Kumiko', 'Noriko', 'Reiko', 'Sachiko', 'Tomoko', 'Yoko', 'Yoshiko', 'Keiko'
      ]
    },
    surnames: [
      'Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato',
      'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Saito', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu',
      'Yamazaki', 'Mori', 'Abe', 'Ikeda', 'Hashimoto', 'Yamashita', 'Ishikawa', 'Nakajima', 'Maeda', 'Fujita'
    ]
  },

  chinese: {
    firstNames: {
      male: [
        'Wei', 'Ming', 'Jun', 'Hao', 'Long', 'Feng', 'Lei', 'Bo', 'Jian', 'Tao',
        'Yang', 'Kai', 'Chen', 'Qiang', 'Hua', 'Peng', 'Yong', 'Xin', 'Jin', 'Hui',
        'Liang', 'Chao', 'Gang', 'Yu', 'Jie', 'Dong', 'Bin', 'Rui', 'Xiang', 'Zhen'
      ],
      female: [
        'Li', 'Mei', 'Yan', 'Fang', 'Ling', 'Xiu', 'Jing', 'Yue', 'Qing', 'Xia',
        'Hong', 'Ping', 'Na', 'Min', 'Ying', 'Juan', 'Yun', 'Rong', 'Xin', 'Lan',
        'Hui', 'Hua', 'Fei', 'Yu', 'Dan', 'Shu', 'Fen', 'Jia', 'Lin', 'Qian'
      ]
    },
    surnames: [
      'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou',
      'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo', 'He', 'Gao', 'Lin', 'Luo',
      'Zheng', 'Liang', 'Song', 'Tang', 'Xu', 'Han', 'Feng', 'Deng', 'Cao', 'Peng'
    ]
  },

  indian: {
    firstNames: {
      male: [
        'Aarav', 'Arjun', 'Rohan', 'Aditya', 'Aryan', 'Vivaan', 'Vihaan', 'Sai', 'Shaurya', 'Ayaan',
        'Raj', 'Ravi', 'Amit', 'Vikram', 'Rahul', 'Suresh', 'Kiran', 'Manoj', 'Anil', 'Sandeep',
        'Ashok', 'Rajesh', 'Mohan', 'Sanjay', 'Prakash', 'Deepak', 'Anand', 'Vijay', 'Naveen', 'Krishna'
      ],
      female: [
        'Aadhya', 'Ananya', 'Diya', 'Aaradhya', 'Saanvi', 'Pari', 'Sara', 'Aarohi', 'Navya', 'Angel',
        'Priya', 'Neha', 'Anjali', 'Pooja', 'Kavita', 'Rekha', 'Sunita', 'Meera', 'Sita', 'Lakshmi',
        'Deepika', 'Divya', 'Ritu', 'Sapna', 'Swati', 'Vandana', 'Nisha', 'Preeti', 'Shanti', 'Radha'
      ]
    },
    surnames: [
      'Sharma', 'Kumar', 'Singh', 'Patel', 'Verma', 'Gupta', 'Reddy', 'Mehta', 'Joshi', 'Iyer',
      'Nair', 'Desai', 'Rao', 'Malhotra', 'Kapoor', 'Chopra', 'Shah', 'Agarwal', 'Khan', 'Bose',
      'Banerjee', 'Mukherjee', 'Chatterjee', 'Das', 'Roy', 'Sen', 'Menon', 'Pillai', 'Naidu', 'Krishnan'
    ]
  },

  spanish: {
    firstNames: {
      male: [
        'Hugo', 'Martín', 'Lucas', 'Mateo', 'Leo', 'Daniel', 'Alejandro', 'Pablo', 'Manuel', 'Adrián',
        'David', 'Álvaro', 'Javier', 'Sergio', 'Carlos', 'Diego', 'Miguel', 'Antonio', 'José', 'Francisco',
        'Juan', 'Pedro', 'Luis', 'Fernando', 'Rafael', 'Jorge', 'Andrés', 'Raúl', 'Enrique', 'Óscar'
      ],
      female: [
        'Lucía', 'María', 'Martina', 'Paula', 'Sofía', 'Julia', 'Emma', 'Valeria', 'Daniela', 'Alba',
        'Sara', 'Carmen', 'Ana', 'Laura', 'Marta', 'Elena', 'Claudia', 'Carla', 'Adriana', 'Natalia',
        'Isabel', 'Beatriz', 'Cristina', 'Rosa', 'Teresa', 'Pilar', 'Dolores', 'Inés', 'Raquel', 'Silvia'
      ]
    },
    surnames: [
      'García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Martín', 'Gómez',
      'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez', 'Navarro',
      'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Suárez', 'Molina'
    ]
  },

  italian: {
    firstNames: {
      male: [
        'Leonardo', 'Francesco', 'Alessandro', 'Lorenzo', 'Mattia', 'Andrea', 'Gabriele', 'Riccardo', 'Tommaso', 'Edoardo',
        'Marco', 'Luca', 'Davide', 'Giuseppe', 'Antonio', 'Giovanni', 'Stefano', 'Paolo', 'Carlo', 'Roberto',
        'Matteo', 'Nicola', 'Simone', 'Federico', 'Vincenzo', 'Filippo', 'Giorgio', 'Michele', 'Angelo', 'Emanuele'
      ],
      female: [
        'Sofia', 'Giulia', 'Aurora', 'Alice', 'Ginevra', 'Emma', 'Giorgia', 'Greta', 'Beatrice', 'Anna',
        'Chiara', 'Francesca', 'Martina', 'Alessia', 'Sara', 'Valentina', 'Federica', 'Elisa', 'Silvia', 'Laura',
        'Elena', 'Maria', 'Giovanna', 'Claudia', 'Paola', 'Rosa', 'Lucia', 'Serena', 'Monica', 'Cristina'
      ]
    },
    surnames: [
      'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco',
      'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti',
      'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi', 'Caruso', 'Ferrara', 'Galli', 'Martini', 'Leone'
    ]
  }
};

/**
 * Get list of available nationalities
 */
export function getAvailableNationalities(): string[] {
  return Object.keys(NATIONALITY_NAMES).sort();
}

/**
 * Get nationality display name (capitalized)
 */
export function getNationalityDisplayName(nationality: string): string {
  return nationality.charAt(0).toUpperCase() + nationality.slice(1);
}

/**
 * Check if a nationality is supported
 */
export function isNationalitySupported(nationality: string): boolean {
  return nationality.toLowerCase() in NATIONALITY_NAMES;
}

/**
 * Generate a random name for a given nationality and optional gender
 */
export function generateNameForNationality(
  nationality: string,
  gender?: 'male' | 'female'
): { firstName: string; lastName: string; fullName: string } {
  const nationalityKey = nationality.toLowerCase();
  const nameData = NATIONALITY_NAMES[nationalityKey];

  if (!nameData) {
    throw new Error(`Unsupported nationality: ${nationality}`);
  }

  // Select gender (random if not specified)
  const selectedGender = gender || (Math.random() < 0.5 ? 'male' : 'female');

  // Pick random first name and surname
  const firstNames = nameData.firstNames[selectedGender];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = nameData.surnames[Math.floor(Math.random() * nameData.surnames.length)];

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`
  };
}
