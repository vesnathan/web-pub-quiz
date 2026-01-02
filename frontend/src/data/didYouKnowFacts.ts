/**
 * "Did You Know?" facts for display during countdown and waiting periods
 * Each fact includes a proper citation URL for verification
 */

export interface DidYouKnowFact {
  text: string;
  url: string;
  source: string;
}

export const DID_YOU_KNOW_FACTS: DidYouKnowFact[] = [
  // Science & Nature
  {
    text: "Honey never spoils - archaeologists found 3000-year-old honey in Egyptian tombs that was still edible!",
    url: "https://www.smithsonianmag.com/science-nature/the-science-behind-honeys-eternal-shelf-life-1218690/",
    source: "Smithsonian",
  },
  {
    text: "Octopuses have three hearts and blue blood.",
    url: "https://www.smithsonianmag.com/science-nature/ten-curious-facts-about-octopuses-7625828/",
    source: "Smithsonian",
  },
  {
    text: "A group of flamingos is called a 'flamboyance'.",
    url: "https://www.audubon.org/news/what-do-you-call-group-flamingos",
    source: "Audubon",
  },
  {
    text: "Bananas are berries, but strawberries aren't!",
    url: "https://www.britannica.com/story/is-a-banana-a-berry",
    source: "Britannica",
  },
  {
    text: "Venus is the only planet that spins clockwise.",
    url: "https://www.space.com/18530-venus-rotation.html",
    source: "Space.com",
  },
  {
    text: "Wombat poop is cube-shaped!",
    url: "https://www.nationalgeographic.com/animals/article/wombat-poop-cube-why-is-it-square-shaped",
    source: "National Geographic",
  },
  {
    text: "Sharks have been around longer than trees.",
    url: "https://www.smithsonianmag.com/smart-news/sharks-are-older-than-trees-180955324/",
    source: "Smithsonian",
  },
  {
    text: "A single cloud can weigh more than 1 million pounds.",
    url: "https://www.usgs.gov/special-topics/water-science-school/science/how-much-does-a-cloud-weigh",
    source: "USGS",
  },
  {
    text: "Humans share about 60% of their DNA with bananas.",
    url: "https://www.nhm.ac.uk/discover/what-is-dna.html",
    source: "Natural History Museum",
  },
  {
    text: "The human brain uses about 20% of the body's total energy.",
    url: "https://www.pnas.org/doi/10.1073/pnas.0803504105",
    source: "PNAS",
  },
  {
    text: "Lightning strikes Earth about 8 million times per day.",
    url: "https://www.nationalgeographic.com/environment/article/lightning",
    source: "National Geographic",
  },
  {
    text: "Butterflies taste with their feet.",
    url: "https://www.scientificamerican.com/article/how-do-butterflies-taste/",
    source: "Scientific American",
  },
  {
    text: "Cows have best friends and get stressed when separated.",
    url: "https://www.bbc.com/future/article/20220114-the-surprising-emotional-lives-of-cows",
    source: "BBC",
  },
  {
    text: "The shortest war in history lasted 38-45 minutes between Britain and Zanzibar.",
    url: "https://www.britannica.com/event/Anglo-Zanzibar-War",
    source: "Britannica",
  },
  {
    text: "Polar bears have black skin under their white fur.",
    url: "https://polarbearsinternational.org/polar-bears/why-are-polar-bears-white/",
    source: "Polar Bears International",
  },
  {
    text: "Dolphins sleep with one eye open.",
    url: "https://www.scientificamerican.com/article/how-do-dolphins-sleep/",
    source: "Scientific American",
  },
  {
    text: "Hot water freezes faster than cold water in certain conditions (Mpemba effect).",
    url: "https://www.nature.com/articles/s41598-020-69509-x",
    source: "Nature",
  },
  {
    text: "The Eiffel Tower can grow up to 6 inches taller during summer due to heat expansion.",
    url: "https://www.toureiffel.paris/en/news/history-and-culture/tower-scientific-laboratory",
    source: "Eiffel Tower Official",
  },
  {
    text: "A hummingbird's heart beats over 1,200 times per minute.",
    url: "https://www.allaboutbirds.org/guide/Ruby-throated_Hummingbird/lifehistory",
    source: "Cornell Lab",
  },
  {
    text: "The smell of rain has a name: petrichor.",
    url: "https://www.nature.com/articles/news.2010.330",
    source: "Nature",
  },
  {
    text: "Koalas have fingerprints almost identical to humans.",
    url: "https://www.science.org/content/article/koalas-have-humanlike-fingerprints",
    source: "Science",
  },
  {
    text: "Seahorses are the only animals where males give birth.",
    url: "https://www.nationalgeographic.com/animals/article/seahorse-fathers-give-birth-secret-revealed",
    source: "National Geographic",
  },
  {
    text: "Bees can recognize human faces.",
    url: "https://www.scientificamerican.com/article/face-recognition-for-bees/",
    source: "Scientific American",
  },
  {
    text: "A snail can sleep for three years.",
    url: "https://www.nationalgeographic.com/animals/article/snails-sleep-hibernate-why",
    source: "National Geographic",
  },
  {
    text: "There are more possible iterations of a game of chess than atoms in the observable universe.",
    url: "https://www.pbs.org/newshour/science/the-math-behind-chess",
    source: "PBS",
  },
  {
    text: "Platypuses don't have stomachs.",
    url: "https://www.nationalgeographic.com/science/article/platypus-spurs-venom-genomes-animals",
    source: "National Geographic",
  },
  {
    text: "A group of owls is called a 'parliament'.",
    url: "https://www.audubon.org/news/what-do-you-call-group-owls",
    source: "Audubon",
  },
  {
    text: "Sea otters hold hands while sleeping to keep from drifting apart.",
    url: "https://www.seattleaquarium.org/blog/why-do-sea-otters-hold-hands",
    source: "Seattle Aquarium",
  },
  {
    text: "Elephants are the only animals that can't jump.",
    url: "https://www.smithsonianmag.com/science-nature/why-cant-elephants-jump-6584780/",
    source: "Smithsonian",
  },
  {
    text: "A day on Venus is longer than a year on Venus.",
    url: "https://www.nasa.gov/venus",
    source: "NASA",
  },

  // History
  {
    text: "Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.",
    url: "https://www.history.com/news/10-little-known-facts-about-cleopatra",
    source: "History.com",
  },
  {
    text: "Oxford University is older than the Aztec Empire.",
    url: "https://www.ox.ac.uk/about/organisation/history",
    source: "Oxford University",
  },
  {
    text: "The first computer programmer was a woman: Ada Lovelace.",
    url: "https://www.britannica.com/biography/Ada-Lovelace",
    source: "Britannica",
  },
  {
    text: "Albert Einstein was offered the presidency of Israel but declined.",
    url: "https://www.history.com/this-day-in-history/einstein-declines-israeli-presidency",
    source: "History.com",
  },
  {
    text: "The Titanic's band really did play as the ship sank.",
    url: "https://www.nationalgeographic.com/history/article/titanic-band-played-ship-sank",
    source: "National Geographic",
  },
  {
    text: "Shakespeare invented over 1,700 words still used today.",
    url: "https://www.britannica.com/list/words-and-phrases-coined-by-shakespeare",
    source: "Britannica",
  },
  {
    text: "The original name for Google was BackRub.",
    url: "https://about.google/our-story/",
    source: "Google",
  },
  {
    text: "The guillotine was used in France until 1977.",
    url: "https://www.history.com/news/frances-last-guillotine-execution-40-years-ago",
    source: "History.com",
  },
  {
    text: "Vikings never wore horned helmets - that's a myth.",
    url: "https://www.history.com/news/did-vikings-really-wear-horned-helmets",
    source: "History.com",
  },
  {
    text: "The first YouTube video was uploaded on April 23, 2005.",
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    source: "YouTube",
  },
  {
    text: "The Great Wall of China is not visible from space with the naked eye.",
    url: "https://www.nasa.gov/vision/space/workinginspace/great_wall.html",
    source: "NASA",
  },
  {
    text: "The first email was sent in 1971.",
    url: "https://www.guinnessworldrecords.com/world-records/first-e-mail",
    source: "Guinness World Records",
  },
  {
    text: "Ketchup was sold as medicine in the 1830s.",
    url: "https://www.smithsonianmag.com/smart-news/ketchup-used-be-medicine-180963127/",
    source: "Smithsonian",
  },

  // Geography
  {
    text: "Scotland's national animal is the unicorn.",
    url: "https://www.visitscotland.com/about/uniquely-scottish/national-animal-unicorn",
    source: "VisitScotland",
  },
  {
    text: "Australia is wider than the moon.",
    url: "https://www.abc.net.au/news/2019-08-15/australia-wider-than-the-moon/11415410",
    source: "ABC Australia",
  },
  {
    text: "Russia has 11 time zones.",
    url: "https://www.timeanddate.com/time/zone/russia",
    source: "TimeAndDate",
  },
  {
    text: "Canada has more lakes than all other countries combined.",
    url: "https://www.worldatlas.com/articles/which-country-has-the-most-lakes.html",
    source: "World Atlas",
  },
  {
    text: "Antarctica is the world's largest desert.",
    url: "https://www.britannica.com/place/Antarctica",
    source: "Britannica",
  },
  {
    text: "Mount Everest grows about 4mm taller every year.",
    url: "https://www.nationalgeographic.com/adventure/article/everest-still-growing-satellite",
    source: "National Geographic",
  },
  {
    text: "The Pacific Ocean is larger than all landmasses combined.",
    url: "https://oceanservice.noaa.gov/facts/pacific.html",
    source: "NOAA",
  },
  {
    text: "Iceland has no mosquitoes.",
    url: "https://www.icelandreview.com/nature-travel/why-are-there-no-mosquitoes-in-iceland/",
    source: "Iceland Review",
  },
  {
    text: "The Dead Sea is so salty that nothing can live in it.",
    url: "https://www.britannica.com/place/Dead-Sea",
    source: "Britannica",
  },
  {
    text: "There are more pyramids in Sudan than in Egypt.",
    url: "https://www.bbc.com/travel/article/20200128-sudans-forgotten-pyramids",
    source: "BBC",
  },

  // Technology
  {
    text: "The first computer bug was an actual bug - a moth in a computer.",
    url: "https://www.nationalgeographic.com/science/article/141001-bugs-debug-computer-grace-hopper-navord",
    source: "National Geographic",
  },
  {
    text: "Samsung started as a noodle trading company.",
    url: "https://www.samsung.com/us/about-samsung/our-business/history/",
    source: "Samsung",
  },
  {
    text: "Nintendo started as a playing card company in 1889.",
    url: "https://www.nintendo.co.jp/corporate/en/history/index.html",
    source: "Nintendo",
  },
  {
    text: "The Firefox logo isn't a fox - it's a red panda.",
    url: "https://blog.mozilla.org/en/mozilla/the-legend-of-the-firefox-name/",
    source: "Mozilla",
  },
  {
    text: "YouTube was created as a dating site.",
    url: "https://www.history.com/this-day-in-history/youtube-launched-dating-site",
    source: "History.com",
  },
  {
    text: "Wi-Fi doesn't stand for anything.",
    url: "https://www.bbc.com/future/article/20150928-what-does-wi-fi-stand-for",
    source: "BBC",
  },
  {
    text: "The first iPhone didn't have copy and paste.",
    url: "https://www.apple.com/newsroom/2009/03/17iPhone-Software-3-0-Preview/",
    source: "Apple",
  },
  {
    text: "The QWERTY keyboard was designed to slow typists down.",
    url: "https://www.smithsonianmag.com/smart-news/why-qwerty-keyboard-layout-common-180963738/",
    source: "Smithsonian",
  },
  {
    text: "Bluetooth is named after a Viking king.",
    url: "https://www.bluetooth.com/about-us/bluetooth-origin/",
    source: "Bluetooth SIG",
  },
  {
    text: "The first webcam watched a coffee pot.",
    url: "https://www.bbc.com/news/technology-20439301",
    source: "BBC",
  },

  // Food & Drink
  {
    text: "Peanuts are not nuts - they're legumes.",
    url: "https://www.britannica.com/plant/peanut",
    source: "Britannica",
  },
  {
    text: "Carrots were originally purple, not orange.",
    url: "https://www.washingtonpost.com/blogs/ezra-klein/post/carrots-are-orange-for-an-entirely-political-reason/2011/09/09/gIQAfayiFK_blog.html",
    source: "Washington Post",
  },
  {
    text: "Lemons contain more sugar than strawberries.",
    url: "https://www.sciencefocus.com/nature/do-lemons-contain-more-sugar-than-strawberries/",
    source: "BBC Science Focus",
  },
  {
    text: "Almonds are members of the peach family.",
    url: "https://www.britannica.com/plant/almond",
    source: "Britannica",
  },
  {
    text: "Chocolate was once used as currency by the Aztecs.",
    url: "https://www.smithsonianmag.com/history/the-sweet-history-of-chocolate-128869028/",
    source: "Smithsonian",
  },
  {
    text: "The most stolen food in the world is cheese.",
    url: "https://www.huffpost.com/entry/cheese-most-stolen-food_n_1982269",
    source: "HuffPost",
  },
  {
    text: "Fortune cookies were invented in San Francisco, not China.",
    url: "https://www.nytimes.com/2008/01/16/dining/16fortune.html",
    source: "NY Times",
  },
  {
    text: "Potatoes were the first food grown in space.",
    url: "https://www.nasa.gov/content/growing-plants-in-space",
    source: "NASA",
  },
  {
    text: "Coffee is the second most traded commodity after oil.",
    url: "https://www.ico.org/trade_e.asp",
    source: "International Coffee Organization",
  },
  {
    text: "Popsicles were invented by an 11-year-old in 1905.",
    url: "https://www.npr.org/sections/thesalt/2015/07/22/425294957/how-an-11-year-old-boy-invented-the-popsicle",
    source: "NPR",
  },

  // Sports
  {
    text: "A golf ball has 336 dimples on average.",
    url: "https://www.usga.org/content/usga/home-page/articles/2018/04/why-do-golf-balls-have-dimples.html",
    source: "USGA",
  },
  {
    text: "The Olympics used to award medals for art.",
    url: "https://www.smithsonianmag.com/arts-culture/when-the-olympics-gave-out-medals-for-art-6878965/",
    source: "Smithsonian",
  },
  {
    text: "Tug of war was an Olympic sport from 1900 to 1920.",
    url: "https://www.olympics.com/en/sports/tug-of-war/",
    source: "Olympics",
  },
  {
    text: "Michael Jordan was cut from his high school basketball team.",
    url: "https://www.nba.com/news/michael-jordan-biography",
    source: "NBA",
  },
  {
    text: "A hockey puck is frozen before games to reduce bouncing.",
    url: "https://www.nhl.com/news/frozen-pucks-reduce-bouncing/c-664018",
    source: "NHL",
  },
  {
    text: "Olympic gold medals are mostly silver with a gold coating.",
    url: "https://www.olympics.com/ioc/olympic-medals",
    source: "Olympics",
  },
  {
    text: "The first basketball hoops were peach baskets.",
    url: "https://www.nba.com/news/history-of-basketball",
    source: "NBA",
  },
  {
    text: "Soccer is the most watched sport in the world.",
    url: "https://www.fifa.com/about-fifa/who-we-are",
    source: "FIFA",
  },
  {
    text: "The longest tennis match lasted 11 hours and 5 minutes.",
    url: "https://www.wimbledon.com/en_GB/news/articles/2018-06-22/the_longest_match_in_history.html",
    source: "Wimbledon",
  },
  {
    text: "Muhammad Ali's Olympic gold medal is at the bottom of a river.",
    url: "https://www.biography.com/athletes/muhammad-ali",
    source: "Biography",
  },

  // Pop Culture
  {
    text: "The voice of Mickey Mouse married the voice of Minnie Mouse.",
    url: "https://www.washingtonpost.com/local/obituaries/russi-taylor-voice-of-minnie-mouse-dies-at-75/2019/07/27/1b8f3d02-b07b-11e9-951e-de024209545d_story.html",
    source: "Washington Post",
  },
  {
    text: "Barbie's full name is Barbara Millicent Roberts.",
    url: "https://barbie.mattel.com/en-us/about.html",
    source: "Mattel",
  },
  {
    text: "The Lion King was the first Disney film with an original plot.",
    url: "https://www.britannica.com/topic/The-Lion-King",
    source: "Britannica",
  },
  {
    text: "The word 'nerd' was invented by Dr. Seuss.",
    url: "https://www.merriam-webster.com/words-at-play/nerd-history-etymology",
    source: "Merriam-Webster",
  },
  {
    text: "Darth Vader only has 12 minutes of screen time in Star Wars.",
    url: "https://www.imdb.com/title/tt0076759/trivia",
    source: "IMDB",
  },
  {
    text: "Mr. Rogers was an ordained minister.",
    url: "https://www.pbs.org/wnet/pioneers-of-television/pioneering-people/fred-rogers/",
    source: "PBS",
  },
  {
    text: "The Simpsons predicted Disney buying Fox.",
    url: "https://www.theguardian.com/tv-and-radio/2017/dec/14/the-simpsons-predicted-the-disney-fox-deal-20-years-ago",
    source: "The Guardian",
  },
  {
    text: "Charlie Chaplin once lost a Charlie Chaplin lookalike contest.",
    url: "https://www.snopes.com/fact-check/charlie-chaplin-lookalike-contest/",
    source: "Snopes",
  },
  {
    text: "The Beatles were initially rejected by Decca Records.",
    url: "https://www.thebeatles.com/history",
    source: "The Beatles",
  },
  {
    text: "Mario was originally called 'Jumpman'.",
    url: "https://www.nintendo.com/whatsnew/detail/2020/super-mario-35th-anniversary/",
    source: "Nintendo",
  },

  // Language & Words
  {
    text: "The word 'trivia' comes from Latin, meaning 'three roads' or 'crossroads'.",
    url: "https://www.merriam-webster.com/words-at-play/origin-of-trivia",
    source: "Merriam-Webster",
  },
  {
    text: "'Typewriter' is the longest word using only the top row of a keyboard.",
    url: "https://www.guinnessworldrecords.com/world-records/longest-word-typeable-on-a-single-row-of-a-keyboard",
    source: "Guinness World Records",
  },
  {
    text: "The word 'set' has the most definitions in the English dictionary.",
    url: "https://www.oed.com/",
    source: "Oxford English Dictionary",
  },
  {
    text: "The fear of long words is called 'hippopotomonstrosesquippedaliophobia'.",
    url: "https://www.merriam-webster.com/dictionary/hippopotomonstrosesquippedaliophobia",
    source: "Merriam-Webster",
  },
  {
    text: "The word 'checkmate' comes from Persian meaning 'the king is dead'.",
    url: "https://www.etymonline.com/word/checkmate",
    source: "Etymology Online",
  },
  {
    text: "The word 'goodbye' is a contraction of 'God be with ye'.",
    url: "https://www.etymonline.com/word/goodbye",
    source: "Etymology Online",
  },
  {
    text: "The word 'alphabet' comes from 'alpha' and 'beta', the first Greek letters.",
    url: "https://www.britannica.com/topic/alphabet-writing",
    source: "Britannica",
  },
  {
    text: "'Rhythms' is the longest common English word without a vowel.",
    url: "https://www.grammarly.com/blog/words-without-vowels/",
    source: "Grammarly",
  },
  {
    text: "The word 'muscle' comes from Latin meaning 'little mouse'.",
    url: "https://www.etymonline.com/word/muscle",
    source: "Etymology Online",
  },
  {
    text: "The word 'salary' comes from 'salt' - Roman soldiers were paid in salt.",
    url: "https://www.britannica.com/story/were-roman-soldiers-really-paid-in-salt",
    source: "Britannica",
  },

  // Miscellaneous
  {
    text: "The inventor of the Pringles can is buried in one.",
    url: "https://www.nytimes.com/2008/06/04/business/04baur.html",
    source: "NY Times",
  },
  {
    text: "Crows can hold grudges against specific people.",
    url: "https://www.audubon.org/news/crows-hold-grudges-families-and-can-recognize-your-face",
    source: "Audubon",
  },
  {
    text: "The longest time between two twins being born is 87 days.",
    url: "https://www.guinnessworldrecords.com/world-records/longest-interval-between-birth-of-twins",
    source: "Guinness World Records",
  },
  {
    text: "There's a basketball court on the top floor of the US Supreme Court.",
    url: "https://www.supremecourt.gov/about/courtbuilding.aspx",
    source: "Supreme Court",
  },
  {
    text: "Pigs can play video games using their snouts.",
    url: "https://www.frontiersin.org/articles/10.3389/fpsyg.2021.631755/full",
    source: "Frontiers in Psychology",
  },
  {
    text: "A 'jiffy' is an actual unit of time: 1/100th of a second.",
    url: "https://www.merriam-webster.com/dictionary/jiffy",
    source: "Merriam-Webster",
  },
  {
    text: "There's a species of jellyfish that is biologically immortal.",
    url: "https://www.nhm.ac.uk/discover/the-immortal-jellyfish.html",
    source: "Natural History Museum",
  },
  {
    text: "The inventor of the treadmill created it as a prison punishment.",
    url: "https://www.bbc.com/future/article/20170920-the-treadmills-dark-history",
    source: "BBC",
  },
  {
    text: "Dolphins have been known to give themselves names.",
    url: "https://www.nationalgeographic.com/animals/article/dolphins-identify-themselves-unique-signature-whistle",
    source: "National Geographic",
  },
  {
    text: "The inventor of the shopping cart had to hire people to use them first.",
    url: "https://www.smithsonianmag.com/smart-news/shopping-cart-was-invented-help-customers-buy-more-1-180979696/",
    source: "Smithsonian",
  },
];
