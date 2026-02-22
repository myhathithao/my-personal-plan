/* quotes.js — Rotating motivational quotes */
const QUOTES = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Your only limit is your mind.", author: "Unknown" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
    { text: "You are capable of more than you know.", author: "Unknown" },
    { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
    { text: "Dream big. Start small. Act now.", author: "Robin Sharma" },
    { text: "Consistency is the key to achieving and maintaining momentum.", author: "Darren Hardy" },
    { text: "You've got what it takes, but it will take everything you've got.", author: "Unknown" },
    { text: "Little by little, a little becomes a lot.", author: "Tanzanian Proverb" },
    { text: "Every day is a chance to be better than yesterday. 🌸", author: "Unknown" },
    { text: "You glow differently when you actually go after what you want.", author: "Unknown" },
    { text: "Be patient with yourself. Self-growth is tender; it's holy ground.", author: "Stephen Covey" },
    { text: "What you do every day matters more than what you do once in a while.", author: "Unknown" },
];

function initQuotes() {
    const quoteText = document.getElementById('quoteText');
    const quoteAuthor = document.getElementById('quoteAuthor');
    const refreshBtn = document.getElementById('refreshQuote');

    let idx = Storage.get('quoteIdx', 0);

    function showQuote(i) {
        const q = QUOTES[i % QUOTES.length];
        quoteText.textContent = q.text;
        quoteAuthor.textContent = '— ' + q.author;
        Storage.set('quoteIdx', i % QUOTES.length);
    }

    showQuote(idx);
    refreshBtn.addEventListener('click', () => {
        idx = (idx + 1) % QUOTES.length;
        showQuote(idx);
    });
}
