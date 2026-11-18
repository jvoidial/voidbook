import React, { useMemo } from 'react';
import { Text, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

// Turns post/comment text into interactive text: #hashtags open the hashtag
// feed, @mentions open the mentioned profile, and URLs open in the browser.
//
// Nested <Text onPress> wins over the card's outer TouchableOpacity, so tapping
// a tag does not also open the post — this is the standard pattern and the
// reason the whole thing is one <Text> rather than a row of views.

// Split on whitespace but keep it, so the original spacing is preserved.
const splitWhitespace = (s) => (s || '').split(/(\s+)/);

// A token is only a tag if it starts with the symbol and has at least one word
// character; trailing punctuation ("#news," / "@joe.") is kept as plain text so
// the link target is the bare tag.
const TAG = /^([#@])(\w+)(.*)$/;
const URL = /^(https?:\/\/\S+?)([.,!?)\]]*)$/i;

function tokenize(text) {
  return splitWhitespace(text).map((part, i) => {
    if (!part) return { type: 'text', value: part, key: i };
    if (/^\s+$/.test(part)) return { type: 'text', value: part, key: i };

    const tag = part.match(TAG);
    if (tag) {
      const [, sym, word, rest] = tag;
      return { type: sym === '#' ? 'hashtag' : 'mention', value: `${sym}${word}`, rest, key: i };
    }

    const url = part.match(URL);
    if (url) return { type: 'url', value: url[1], rest: url[2], key: i };

    return { type: 'text', value: part, key: i };
  });
}

export default function RichText({ text, style, linkStyle }) {
  const nav = useNavigation();
  const { state } = useApp();

  // handle (without the @, lowercased) -> user id, for resolving mentions.
  const byHandle = useMemo(() => Object.fromEntries(
    (state.users || [])
      .filter(u => u.handle)
      .map(u => [String(u.handle).toLowerCase().replace(/^@/, ''), u.id]),
  ), [state.users]);

  const link = linkStyle || { color: T.link };
  const tokens = useMemo(() => tokenize(text), [text]);

  return (
    <Text style={style}>
      {tokens.map((t) => {
        if (t.type === 'hashtag') {
          return (
            <Text key={t.key} style={link}
              onPress={() => nav.push('Hashtag', { tag: t.value })}>
              {t.value}{t.rest}
            </Text>
          );
        }
        if (t.type === 'mention') {
          const id = byHandle[t.value.slice(1).toLowerCase()];
          return (
            <Text key={t.key} style={link}
              onPress={() => { if (id) nav.push('UserProfile', { userId: id }); }}>
              {t.value}{t.rest}
            </Text>
          );
        }
        if (t.type === 'url') {
          return (
            <Text key={t.key} style={link}
              onPress={() => Linking.openURL(t.value).catch(() => {})}>
              {t.value}{t.rest}
            </Text>
          );
        }
        return <Text key={t.key}>{t.value}</Text>;
      })}
    </Text>
  );
}
