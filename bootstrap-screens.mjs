import fs from 'fs';
import path from 'path';

const APP_DIR = path.resolve('c:/SE121/Healthcare-System-FE/apps/mobile/src/app');

const files = {
  '(patient)/appointments.tsx': 'Patient Appointments',
  '(patient)/chat.tsx': 'Patient Chat',
  '(patient)/profile.tsx': 'Patient Profile',
  '(doctor)/schedule.tsx': 'Doctor Schedule',
  '(doctor)/queue.tsx': 'Doctor Queue',
  '(doctor)/chat.tsx': 'Doctor Chat',
  '(doctor)/settings.tsx': 'Doctor Settings',
};

const template = (title) => `import { View, Text } from "../../tw";

export default function Screen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-900">
      <Text className="text-2xl font-bold dark:text-white">${title}</Text>
    </View>
  );
}
`;

Object.entries(files).forEach(([file, title]) => {
  const filePath = path.join(APP_DIR, file);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, template(title));
  console.log(`Created ${file}`);
});
