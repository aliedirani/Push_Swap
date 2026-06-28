/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   checker_read_bonus.c                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/12 00:00:00 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:16:44 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap_bonus.h"

static int	fill_line(int fd, char *buffer)
{
	int	i;
	int	bytes_read;

	i = 0;
	while (1)
	{
		bytes_read = read(fd, &buffer[i], 1);
		if (bytes_read <= 0)
			break ;
		if (buffer[i] == '\n')
			break ;
		i++;
		if (i >= 999)
			break ;
	}
	if (i == 0 && bytes_read <= 0)
		return (-1);
	if (buffer[i] == '\n')
		buffer[i] = '\0';
	else
		buffer[i] = '\0';
	return (i);
}

char	*checker_get_line(int fd)
{
	char	buffer[1000];
	char	*line;
	int		i;

	i = fill_line(fd, buffer);
	if (i < 0)
		return (NULL);
	line = malloc(sizeof(char) * (i + 1));
	if (!line)
		return (NULL);
	i = 0;
	while (buffer[i])
	{
		line[i] = buffer[i];
		i++;
	}
	line[i] = '\0';
	return (line);
}
