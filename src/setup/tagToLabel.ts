const availableLabels = [
  'parentSuite',
  'suite',
  'subSuite',
  'epic',
  'feature',
  'story',
  'severity',
  'tag',
  'owner',
  'testID'
];

const labelPattern = `@(${availableLabels.join('|')})\\("(.*?)"\\)`;
const regExp = new RegExp(labelPattern);

const tagToLabel = ({ name }: { name: string }) => {
  const match = regExp.exec(name);

  if (match) {
    const [, tagName, value] = match;

    return [tagName, value];
  }

  return [];
};

export default tagToLabel;
