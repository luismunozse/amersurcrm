declare module 'html-to-docx' {
  interface Options {
    table?: { row?: { cantSplit?: boolean } };
    footer?: boolean;
    header?: boolean;
    pageNumber?: boolean;
  }
  export default function htmlToDocx(
    html: string,
    headerHtml: string | null,
    options?: Options
  ): Promise<Blob | Buffer>;
}
