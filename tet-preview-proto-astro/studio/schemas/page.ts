export default {
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string' },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
    },
    {
      name: 'blocks',
      title: 'Blocks',
      type: 'array',
      of: [
        {
          name: 'paragraph',
          title: 'Paragraph',
          type: 'object',
          fields: [
            {
              name: 'body',
              title: 'Body',
              type: 'array',
              of: [{ type: 'block' }],
            },
          ],
          preview: {
            select: { body: 'body' },
            prepare({ body }: any) {
              const first = body?.[0]?.children?.[0]?.text || '(empty paragraph)';
              return { title: `Paragraph: ${first.slice(0, 40)}` };
            },
          },
        },
        {
          name: 'counter',
          title: 'Counter',
          type: 'object',
          fields: [
            {
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule: any) => Rule.required(),
            },
          ],
          preview: {
            select: { label: 'label' },
            prepare({ label }: any) {
              return { title: `Counter: ${label || '(no label)'}` };
            },
          },
        },
      ],
    },
  ],
};
