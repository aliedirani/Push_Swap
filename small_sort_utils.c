/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   small_sort_utils.c                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/12 00:00:00 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:17:58 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap.h"

static int	find_min_pos(t_stack *stack)
{
	int		min_idx;
	int		pos;
	int		min_pos;
	t_stack	*tmp;

	tmp = stack;
	min_idx = tmp->index;
	min_pos = 0;
	pos = 0;
	while (tmp)
	{
		if (tmp->index < min_idx)
		{
			min_idx = tmp->index;
			min_pos = pos;
		}
		pos++;
		tmp = tmp->next;
	}
	return (min_pos);
}

void	sort_four(t_data *data)
{
	int	min_pos;

	min_pos = find_min_pos(data->a);
	if (min_pos == 1)
		ra(data, 1);
	else if (min_pos == 2)
	{
		ra(data, 1);
		ra(data, 1);
	}
	else if (min_pos == 3)
		rra(data, 1);
	pb(data, 1);
	sort_three(data);
	pa(data, 1);
}

void	sort_five(t_data *data)
{
	int	min_pos;

	min_pos = find_min_pos(data->a);
	if (min_pos == 1)
		ra(data, 1);
	else if (min_pos == 2)
	{
		ra(data, 1);
		ra(data, 1);
	}
	else if (min_pos == 3)
	{
		rra(data, 1);
		rra(data, 1);
	}
	else if (min_pos == 4)
		rra(data, 1);
	pb(data, 1);
	sort_four(data);
	pa(data, 1);
}
