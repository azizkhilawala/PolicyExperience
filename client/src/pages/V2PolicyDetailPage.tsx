import { useParams } from 'react-router-dom';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';

export default function V2PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <VStack gap={3} padding={4}>
      <Heading level={1}>Policy-v2 Detail</Heading>
      <Text>Policy {id} detail will be implemented here.</Text>
    </VStack>
  );
}
