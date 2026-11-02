import aiBlue from '../assets/icons/ai-blue.svg';
import aiYellow from '../assets/icons/ai-yellow.svg';
import complementarityBlue from '../assets/icons/ai-complementariteit-blue.svg';
import complementarityYellow from '../assets/icons/ai-complementariteit-yellow.svg';
import agendaBlue from '../assets/icons/agenda-blue.svg';
import agendaYellow from '../assets/icons/agenda-yellow.svg';
import skillsBlue from '../assets/icons/skills-blue.svg';
import skillsYellow from '../assets/icons/skills-yellow.svg';

import educationBlue from '../assets/icons/onderwijs-blue.svg';
import educationYellow from '../assets/icons/onderwijs-yellow.svg';

const icons = {
  ai: [aiBlue, aiYellow],
  'ai-complementariteit': [complementarityBlue, complementarityYellow],
  agenda: [agendaBlue, agendaYellow],
  skills: [skillsBlue, skillsYellow],
  onderwijs: [educationBlue, educationYellow],
};

export function TopicIcon({ name }: { name: keyof typeof icons }) {
  const [light, dark] = icons[name];
  return (
    <span className="topic-icon" aria-hidden="true">
      <img className="topic-icon-light" src={light} alt="" width="64" height="64" />
      <img className="topic-icon-dark" src={dark} alt="" width="64" height="64" />
    </span>
  );
}
