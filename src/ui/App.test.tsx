import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

function startTxtImport(name: string) {
  let settleRead!: (result: string | Error) => void;
  const pendingText = new Promise<string>((resolve, reject) => {
    settleRead = (result) => {
      if (result instanceof Error) reject(result);
      else resolve(result);
    };
  });
  const file = new File([], name, { type: 'text/plain' });
  Object.defineProperty(file, 'text', { value: () => pendingText });
  fireEvent.change(screen.getByLabelText('Subir TXT'), { target: { files: [file] } });

  return async (result: string | Error) => {
    await act(async () => settleRead(result));
  };
}

describe('App', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    URL.createObjectURL = vi.fn(() => 'blob:homofonia');
    URL.revokeObjectURL = vi.fn();
  });

  it('transforms pasted text automatically', () => {
    render(<App />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Texto original' }), {
      target: { value: 'No sé decirte' },
    });

    expect(screen.getByText('zé')).toBeInTheDocument();
    expect(screen.getByText('desirte')).toBeInTheDocument();
  });

  it('opens the hidden file input through the visible TXT button', () => {
    render(<App />);
    const picker = screen.getByLabelText('Subir TXT');
    const openPicker = vi.spyOn(picker, 'click');

    expect(picker).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir selector TXT' }));
    expect(openPicker).toHaveBeenCalledOnce();
  });

  it('loads a txt file', async () => {
    render(<App />);

    const file = new File(['Tu voz'], 'sample.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('Subir TXT'), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText('bos')).toBeInTheDocument();
    });
  });

  it('announces a TXT read failure, preserves the text and lets the user retry', async () => {
    render(<App />);
    const editor = screen.getByRole('textbox', { name: 'Texto original' });
    const output = screen.getByLabelText('Texto transformado');
    fireEvent.change(editor, { target: { value: 'Mi casa' } });

    const finishRead = startTxtImport('sample.txt');
    await finishRead(new Error('Synthetic read failure'));

    const inputPanel = screen.getByRole('region', { name: 'Texto original' });
    expect(within(inputPanel).getByRole('alert')).toHaveTextContent('No se pudo leer el archivo TXT');
    expect(editor).toHaveValue('Mi casa');
    expect(output).toHaveTextContent('Mi kaza');

    const finishRetry = startTxtImport('sample.txt');
    await finishRetry('Tu voz');
    expect(screen.queryByText(/no se pudo leer/i)).not.toBeInTheDocument();
    expect(editor).toHaveValue('Tu voz');
    expect(output).toHaveTextContent('Tu bos');
  });

  it('ignores a TXT read failure superseded by a newer import', async () => {
    render(<App />);
    const finishOlder = startTxtImport('older.txt');
    const finishNewer = startTxtImport('newer.txt');
    await finishNewer('Mi casa');
    await finishOlder(new Error('Synthetic read failure'));

    expect(screen.queryByText(/no se pudo leer/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Texto transformado')).toHaveTextContent('Mi kaza');
  });

  it('keeps edits made while a TXT file is loading', async () => {
    render(<App />);
    const finishRead = startTxtImport('older.txt');
    const editor = screen.getByRole('textbox', { name: 'Texto original' });

    fireEvent.change(editor, { target: { value: 'Mi casa' } });
    await finishRead('Texto anterior');

    expect(editor).toHaveValue('Mi casa');
    expect(screen.getByLabelText('Texto transformado')).toHaveTextContent('Mi kaza');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copiar/i }));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Mi kaza');
  });

  it.each(['older', 'newer'] as const)(
    'uses the last selected TXT when the %s file finishes first',
    async (first) => {
      render(<App />);
      const editor = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Texto original' });
      const initialText = editor.value;
      const finishOlder = startTxtImport('older.txt');
      const finishNewer = startTxtImport('newer.txt');

      if (first === 'older') {
        await finishOlder('Texto anterior');
        expect(editor).toHaveValue(initialText);
        await finishNewer('Tu voz');
      } else {
        await finishNewer('Tu voz');
        await finishOlder('Texto anterior');
      }

      expect(editor).toHaveValue('Tu voz');
      expect(screen.getByLabelText('Texto transformado')).toHaveTextContent('Tu bos');
    },
  );

  it('allows manual replacement review', () => {
    render(<App />);

    const visual = screen.getByRole('button', { name: 'Visual', pressed: true });
    const manual = screen.getByRole('button', { name: 'Manual', pressed: false });
    fireEvent.click(manual);
    expect(visual).toHaveAttribute('aria-pressed', 'false');
    expect(manual).toHaveAttribute('aria-pressed', 'true');

    const select = screen.getByDisplayValue('zé');
    fireEvent.change(select, { target: { value: '__original__' } });

    expect(screen.getByLabelText('Texto transformado')).toHaveTextContent(
      'No sé desirte',
    );
  });

  it('copies output', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /copiar/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'No zé desirte\nKómo fue\nNi explikarme ké pazó',
      );
    });
  });

  it('keeps the complete long result available to read and copy', async () => {
    render(<App />);
    const original = 'casa '.repeat(2000) + 'voz';
    const expected = 'kaza '.repeat(2000) + 'bos';
    fireEvent.change(screen.getByRole('textbox', { name: 'Texto original' }), {
      target: { value: original },
    });

    const result = screen.getByRole('textbox', { name: 'Texto transformado' });
    expect(result).toHaveAttribute('readonly');
    expect(result).toHaveValue(expected);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copiar' })));
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(expected);
  });

  it('keeps choices across review pages and starts again when the text changes', () => {
    render(<App />);
    const editor = screen.getByRole('textbox', { name: 'Texto original' });
    const review = () => within(screen.getByRole('region', { name: 'Revisión' }));
    fireEvent.change(editor, { target: { value: 'casa '.repeat(50) + 'voz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Manual' }));

    expect(review().getAllByRole('combobox')).toHaveLength(50);
    fireEvent.click(review().getByRole('button', { name: 'Siguiente' }));
    fireEvent.change(review().getByRole('combobox', { name: 'voz' }), {
      target: { value: '__original__' },
    });
    expect(screen.getByLabelText('Texto transformado')).toHaveTextContent(/voz$/);
    fireEvent.click(review().getByRole('button', { name: 'Anterior' }));
    fireEvent.click(review().getByRole('button', { name: 'Siguiente' }));
    expect(review().getByRole('combobox', { name: 'voz' })).toHaveValue('__original__');

    fireEvent.change(editor, { target: { value: 'casa '.repeat(50) + 'luz' } });
    expect(review().getByRole('status')).toHaveTextContent('Página 1 de 2');
    expect(review().queryByRole('combobox', { name: 'luz' })).not.toBeInTheDocument();
  });

  it('announces a denied clipboard write and clears the notice on retry', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
    render(<App />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Texto original' }), {
      target: { value: 'Mi casa' },
    });
    const copyButton = screen.getByRole('button', { name: 'Copiar' });
    await act(async () => fireEvent.click(copyButton));

    const outputPanel = screen.getByRole('region', { name: 'Resultado' });
    expect(within(outputPanel).getByRole('alert')).toHaveTextContent('No se pudo copiar el resultado');
    expect(copyButton).toHaveTextContent('Copiar');
    expect(screen.getByLabelText('Texto transformado')).toHaveTextContent('Mi kaza');

    await act(async () => fireEvent.click(copyButton));
    expect(screen.queryByText(/no se pudo copiar/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiado' })).toBeInTheDocument();
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith('Mi kaza');
  });

  it('starts a txt download', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Descargar TXT' }));

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
