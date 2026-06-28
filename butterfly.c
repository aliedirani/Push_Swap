/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   butterfly.c                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/01/02 20:13:12 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:16:39 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap.h"

static void	push_to_b(t_data *data, int *next_index, int chunk_size)
{
	if (data->a->index <= *next_index)
	{
		pb(data, 1);
		rb(data, 1);
		(*next_index)++;
	}
	else if (data->a->index <= *next_index + chunk_size)
	{
		pb(data, 1);
		(*next_index)++;
	}
	else
		ra(data, 1);
}

void	butterfly_sort(t_data *data)
{
	int	chunk_size;
	int	next_index;

	chunk_size = get_chunk_size(data->size);
	next_index = 0;
	while (data->a)
		push_to_b(data, &next_index, chunk_size);
	push_all_to_a(data);
}
