import Page from "@/components/ui/Page";
import Card from "@/components/ui/Card";

export default function CenteredCardsLayout({ title, sections = [] }) {
  return (
    <Page title={title}>
      {sections.map((Section, i) => (
        <Card key={i} className={Section.cardClassName || ""}>
          <Section.Component />
        </Card>
      ))}
    </Page>
  );
}