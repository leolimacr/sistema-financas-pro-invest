import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TableHorizontalScrollWrapper } from '../TableHorizontalScrollWrapper';

describe('TableHorizontalScrollWrapper', () => {
  it('renderiza o conteúdo filho corretamente', () => {
    render(
      <TableHorizontalScrollWrapper>
        <table>
          <tbody>
            <tr>
              <td>Dado 1</td>
              <td>Dado 2</td>
            </tr>
          </tbody>
        </table>
      </TableHorizontalScrollWrapper>
    );

    expect(screen.getByText('Dado 1')).toBeInTheDocument();
    expect(screen.getByText('Dado 2')).toBeInTheDocument();
  });
});
