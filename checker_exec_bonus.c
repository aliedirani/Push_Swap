/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   checker_exec_bonus.c                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/12 00:00:00 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:16:42 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap_bonus.h"

static int	ft_strcmp(const char *s1, const char *s2)
{
	int	i;

	i = 0;
	while (s1[i] && s2[i] && s1[i] == s2[i])
		i++;
	return ((unsigned char)s1[i] - (unsigned char)s2[i]);
}

static int	run_swap_push(t_data *data, char *line)
{
	if (ft_strcmp(line, "sa") == 0)
		sa(data, 0);
	else if (ft_strcmp(line, "sb") == 0)
		sb(data, 0);
	else if (ft_strcmp(line, "ss") == 0)
		ss(data, 0);
	else if (ft_strcmp(line, "pa") == 0)
		pa(data, 0);
	else if (ft_strcmp(line, "pb") == 0)
		pb(data, 0);
	else
		return (0);
	return (1);
}

static int	run_rotate(t_data *data, char *line)
{
	if (ft_strcmp(line, "ra") == 0)
		ra(data, 0);
	else if (ft_strcmp(line, "rb") == 0)
		rb(data, 0);
	else if (ft_strcmp(line, "rr") == 0)
		rr(data, 0);
	else if (ft_strcmp(line, "rra") == 0)
		rra(data, 0);
	else if (ft_strcmp(line, "rrb") == 0)
		rrb(data, 0);
	else if (ft_strcmp(line, "rrr") == 0)
		rrr(data, 0);
	else
		return (0);
	return (1);
}

int	checker_execute(t_data *data, char *line)
{
	if (run_swap_push(data, line))
		return (1);
	if (run_rotate(data, line))
		return (1);
	return (0);
}
