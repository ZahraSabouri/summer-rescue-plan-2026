import { Suspense, lazy } from 'react'

// TipTap (+ its extensions) is a genuinely sizable dependency, and this editor
// is used from several otherwise-eagerly-loaded files (CardDetailDrawer,
// ResourceStudyEditor, GeneralKnowledge, AddCardDialog...). Loading it lazily
// keeps it out of the main entry chunk entirely — someone who never opens a
// text field never downloads it.
const RichTextEditor = lazy(() => import('./RichTextEditor').then((module) => ({ default: module.RichTextEditor })))

function EditorLoadingPlaceholder({ rows = 4 }) {
  return <div className="rich-text-field rich-text-field-loading" style={{ '--rte-rows': rows }} aria-busy="true" />
}

export function LazyRichTextEditor(props) {
  return (
    <Suspense fallback={<EditorLoadingPlaceholder rows={props.rows} />}>
      <RichTextEditor {...props} />
    </Suspense>
  )
}
