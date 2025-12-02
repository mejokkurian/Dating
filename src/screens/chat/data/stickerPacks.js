// Sticker pack configuration
// Using emoji as stickers for simplicity - can be replaced with actual images

const stickerPacks = [
  {
    id: 'emotions',
    name: 'Emotions',
    thumbnail: '😊',
    stickers: [
      { id: 'happy', emoji: '😊', name: 'Happy' },
      { id: 'love', emoji: '😍', name: 'Love' },
      { id: 'laugh', emoji: '😂', name: 'Laugh' },
      { id: 'cool', emoji: '😎', name: 'Cool' },
      { id: 'wink', emoji: '😉', name: 'Wink' },
      { id: 'kiss', emoji: '😘', name: 'Kiss' },
      { id: 'thinking', emoji: '🤔', name: 'Thinking' },
      { id: 'sad', emoji: '😢', name: 'Sad' },
      { id: 'angry', emoji: '😠', name: 'Angry' },
      { id: 'surprised', emoji: '😮', name: 'Surprised' },
      { id: 'tired', emoji: '😴', name: 'Tired' },
      { id: 'sick', emoji: '🤒', name: 'Sick' },
    ],
  },
  {
    id: 'gestures',
    name: 'Gestures',
    thumbnail: '👍',
    stickers: [
      { id: 'thumbsup', emoji: '👍', name: 'Thumbs Up' },
      { id: 'thumbsdown', emoji: '👎', name: 'Thumbs Down' },
      { id: 'clap', emoji: '👏', name: 'Clap' },
      { id: 'wave', emoji: '👋', name: 'Wave' },
      { id: 'ok', emoji: '👌', name: 'OK' },
      { id: 'peace', emoji: '✌️', name: 'Peace' },
      { id: 'pray', emoji: '🙏', name: 'Pray' },
      { id: 'muscle', emoji: '💪', name: 'Strong' },
      { id: 'point', emoji: '👉', name: 'Point' },
      { id: 'fist', emoji: '✊', name: 'Fist' },
      { id: 'heart', emoji: '❤️', name: 'Heart' },
      { id: 'fire', emoji: '🔥', name: 'Fire' },
    ],
  },
  {
    id: 'animals',
    name: 'Animals',
    thumbnail: '🐶',
    stickers: [
      { id: 'dog', emoji: '🐶', name: 'Dog' },
      { id: 'cat', emoji: '🐱', name: 'Cat' },
      { id: 'monkey', emoji: '🐵', name: 'Monkey' },
      { id: 'lion', emoji: '🦁', name: 'Lion' },
      { id: 'tiger', emoji: '🐯', name: 'Tiger' },
      { id: 'bear', emoji: '🐻', name: 'Bear' },
      { id: 'panda', emoji: '🐼', name: 'Panda' },
      { id: 'koala', emoji: '🐨', name: 'Koala' },
      { id: 'fox', emoji: '🦊', name: 'Fox' },
      { id: 'unicorn', emoji: '🦄', name: 'Unicorn' },
      { id: 'penguin', emoji: '🐧', name: 'Penguin' },
      { id: 'chicken', emoji: '🐔', name: 'Chicken' },
    ],
  },
];

export default stickerPacks;
