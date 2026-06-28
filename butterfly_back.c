/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   butterfly_back.c                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/12 00:00:00 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:16:36 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap.h"

static void	rotate_b_to_top(t_data *data, int pos)
{
	int	size;

	size = stack_size(data->b);
	if (pos <= size - pos)
	{
		while (pos-- > 0)
			rb(data, 1);
	}
	else
	{
		pos = size - pos;
		while (pos-- > 0)
			rrb(data, 1);
	}
}

void	push_all_to_a(t_data *data)
{
	int	max_idx;
	int	pos;

	while (data->b)
	{
		max_idx = find_max_index(data->b);
		pos = get_position(data->b, max_idx);
		rotate_b_to_top(data, pos);
		pa(data, 1);
	}
}
